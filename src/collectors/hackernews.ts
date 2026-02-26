import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import { sleep } from "../lib/utils";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

// Generic complaint search queries
const COMPLAINT_QUERIES = [
  "alternative to",
  "switched from",
  "hate using",
  "frustrated with",
  "worst software",
  "terrible software",
  "overpriced software",
  "looking for alternative",
  "replacing",
  "too expensive",
];

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  author?: string;
  story_title?: string;
}

async function searchHN(
  query: string,
  tags: string,
  daysBack: number = 90
): Promise<AlgoliaHit[]> {
  try {
    const since = Math.floor(Date.now() / 1000) - daysBack * 86400;
    const url = `${ALGOLIA_BASE}/search?query=${encodeURIComponent(query)}&tags=${tags}&numericFilters=created_at_i>${since}&hitsPerPage=100`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HN API error for "${query}": ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.hits || [];
  } catch (error) {
    console.error(`HN search failed for "${query}":`, error);
    return [];
  }
}

function hitToComplaint(hit: AlgoliaHit): RawComplaint | null {
  const text = hit.comment_text || hit.story_text || "";
  const title = hit.title || hit.story_title || null;
  if (!text && !title) return null;

  return {
    source: "hackernews",
    source_id: hit.objectID,
    source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    title,
    raw_text: text,
    author: hit.author || null,
    author_role: null,
    author_company_size: null,
    star_rating: null,
    review_date: new Date(hit.created_at),
  };
}

async function getSearchTermsFromDB(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("monitored_categories")
    .select("hn_search_terms")
    .eq("is_active", true);

  if (!data) return [];
  return data.flatMap((row) => row.hn_search_terms || []);
}

export async function collectFromHackerNews(options?: { maxQueries?: number; skipCategoryTerms?: boolean }): Promise<RawComplaint[]> {
  console.log("Collecting from Hacker News...");
  const allItems = new Map<string, RawComplaint>();

  let uniqueQueries: string[];
  if (options?.skipCategoryTerms) {
    uniqueQueries = [...COMPLAINT_QUERIES];
  } else {
    const categoryTerms = await getSearchTermsFromDB();
    uniqueQueries = [...new Set([...COMPLAINT_QUERIES, ...categoryTerms])];
  }
  if (options?.maxQueries) {
    uniqueQueries = uniqueQueries.slice(0, options.maxQueries);
  }

  for (const query of uniqueQueries) {
    console.log(`  Searching HN for: "${query}"`);

    // Search both stories and comments
    const [stories, comments] = await Promise.all([
      searchHN(query, "story"),
      searchHN(query, "comment"),
    ]);

    for (const hit of [...stories, ...comments]) {
      const complaint = hitToComplaint(hit);
      if (complaint && !allItems.has(complaint.source_id)) {
        allItems.set(complaint.source_id, complaint);
      }
    }

    await sleep(100);
  }

  const items = Array.from(allItems.values());
  console.log(`  Found ${items.length} unique HN items`);
  return items;
}

// Main: run standalone
async function main() {
  const supabase = createServerClient();

  // Create collection run
  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "hackernews", status: "running" })
    .select("id")
    .single();

  try {
    const items = await collectFromHackerNews();

    // Insert complaints (no product_id yet — Stage 2 will set it)
    let newCount = 0;
    for (const item of items) {
      const { error } = await supabase.from("complaints").upsert(
        {
          source: item.source,
          source_id: item.source_id,
          source_url: item.source_url,
          title: item.title,
          raw_text: item.raw_text.substring(0, 2000),
          author: item.author,
          review_date: item.review_date.toISOString(),
          analyzed: false,
        },
        { onConflict: "source,source_id", ignoreDuplicates: true }
      );
      if (!error) newCount++;
    }

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: items.length,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`HN collection complete: ${items.length} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("HN collection failed:", error);
    process.exit(1);
  }
}

main();
