import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import { sleep } from "../lib/utils";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

// Complaint qualifiers appended to product name searches
const COMPLAINT_SUFFIXES = [
  "",              // bare product name
  "alternative",   // people looking for alternatives
  "frustrated",    // frustration signals
  "problems",      // problem signals
  "terrible",      // strong negative
  "switched from", // switching signals
];

// Generic terms to skip — only search for actual product names
const GENERIC_TERM_PATTERNS = /\b(software|tool|system|platform|alternative|management|solution)\b/i;

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
    const url = `${ALGOLIA_BASE}/search?query=${encodeURIComponent(query)}&tags=${tags}&numericFilters=created_at_i>${since}&hitsPerPage=50`;
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

function textMentionsProduct(text: string, productName: string): boolean {
  return text.toLowerCase().includes(productName.toLowerCase());
}

function hitToComplaint(hit: AlgoliaHit, targetProduct: string): RawComplaint | null {
  const text = hit.comment_text || hit.story_text || "";
  const title = hit.title || hit.story_title || null;
  if (!text && !title) return null;

  // Verify the product name actually appears in the content
  const fullText = `${title || ""} ${text}`;
  if (!textMentionsProduct(fullText, targetProduct)) return null;

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
    target_product: targetProduct,
  };
}

async function getProductTermsFromDB(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("monitored_categories")
    .select("hn_search_terms")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (!data) return [];
  const allTerms = data.flatMap((row) => row.hn_search_terms || []);
  // Only keep actual product names, skip generic terms
  const productNames = [...new Set(allTerms)].filter(
    (t) => !GENERIC_TERM_PATTERNS.test(t)
  );
  return productNames;
}

export async function collectFromHackerNews(options?: { maxProducts?: number }): Promise<RawComplaint[]> {
  console.log("Collecting from Hacker News (product-centric)...");
  const allItems = new Map<string, RawComplaint>();

  let productTerms = await getProductTermsFromDB();
  if (options?.maxProducts) {
    productTerms = productTerms.slice(0, options.maxProducts);
  }

  console.log(`  Searching for ${productTerms.length} products: ${productTerms.join(", ")}`);

  for (const productName of productTerms) {
    let productHits = 0;

    // Search with complaint qualifiers to get complaint-focused results
    for (const suffix of COMPLAINT_SUFFIXES) {
      const query = suffix ? `${productName} ${suffix}` : productName;

      // Search comments (where most complaints live)
      const comments = await searchHN(query, "comment");
      for (const hit of comments) {
        const complaint = hitToComplaint(hit, productName);
        if (complaint && !allItems.has(complaint.source_id)) {
          allItems.set(complaint.source_id, complaint);
          productHits++;
        }
      }

      // Also search stories for the bare product name only
      if (!suffix) {
        const stories = await searchHN(query, "story");
        for (const hit of stories) {
          const complaint = hitToComplaint(hit, productName);
          if (complaint && !allItems.has(complaint.source_id)) {
            allItems.set(complaint.source_id, complaint);
            productHits++;
          }
        }
      }

      await sleep(100);
    }

    console.log(`  ${productName}: ${productHits} verified items`);
  }

  const items = Array.from(allItems.values());
  console.log(`  Found ${items.length} unique HN items across ${productTerms.length} products`);
  return items;
}

// Main: run standalone
async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "hackernews", status: "running" })
    .select("id")
    .single();

  try {
    const items = await collectFromHackerNews();

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

if (require.main === module) {
  main();
}
