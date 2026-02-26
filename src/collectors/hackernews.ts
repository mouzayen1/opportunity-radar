import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import {
  getAllProductConfigs,
  ProductSearchConfig,
  validateProductMention,
} from "../lib/product-config";
import { sleep } from "../lib/utils";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

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

function hitToComplaint(hit: AlgoliaHit, targetProduct: string): RawComplaint | null {
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
    target_product: targetProduct,
  };
}

/**
 * Build search queries based on product ambiguity tier.
 * SAFE: search the name directly + complaint suffixes
 * RISKY: search the name + a few context anchors
 * DANGEROUS: ONLY search unambiguous forms (never the bare name)
 */
function getSearchQueries(config: ProductSearchConfig): string[] {
  const queries: string[] = [];

  if (config.ambiguity_tier === "safe") {
    // Safe names can be searched directly
    queries.push(config.canonical_name);
    queries.push(`${config.canonical_name} alternative`);
    queries.push(`${config.canonical_name} problems`);
    queries.push(`${config.canonical_name} frustrated`);
  } else if (config.ambiguity_tier === "risky") {
    // Risky names: search with a few key context anchors
    queries.push(config.canonical_name);
    for (const form of config.unambiguous_forms.slice(0, 2)) {
      queries.push(form);
    }
  } else {
    // Dangerous names: ONLY search unambiguous forms
    for (const form of config.unambiguous_forms) {
      queries.push(form);
    }
  }

  return queries;
}

export async function collectFromHackerNews(options?: {
  maxProducts?: number;
}): Promise<RawComplaint[]> {
  console.log("Collecting from Hacker News (5-layer defense)...");
  const allItems = new Map<string, RawComplaint>();

  let configs = getAllProductConfigs();
  if (options?.maxProducts) {
    configs = configs.slice(0, options.maxProducts);
  }

  console.log(`  Searching for ${configs.length} products`);

  for (const config of configs) {
    let productHits = 0;
    let filtered = 0;
    const queries = getSearchQueries(config);

    for (const query of queries) {
      // Search comments (where most complaints live)
      const comments = await searchHN(query, "comment");
      for (const hit of comments) {
        const complaint = hitToComplaint(hit, config.canonical_name);
        if (!complaint || allItems.has(complaint.source_id)) continue;

        // Layer 3: Pre-AI text validation
        const fullText = `${complaint.title || ""} ${complaint.raw_text}`;
        const validation = validateProductMention(fullText, config);
        if (!validation.valid) {
          filtered++;
          continue;
        }

        allItems.set(complaint.source_id, complaint);
        productHits++;
      }

      // Also search stories for safe/risky products (first query only)
      if (config.ambiguity_tier !== "dangerous" && query === queries[0]) {
        const stories = await searchHN(query, "story");
        for (const hit of stories) {
          const complaint = hitToComplaint(hit, config.canonical_name);
          if (!complaint || allItems.has(complaint.source_id)) continue;

          const fullText = `${complaint.title || ""} ${complaint.raw_text}`;
          const validation = validateProductMention(fullText, config);
          if (!validation.valid) {
            filtered++;
            continue;
          }

          allItems.set(complaint.source_id, complaint);
          productHits++;
        }
      }

      await sleep(100);
    }

    console.log(`  ${config.canonical_name} (${config.ambiguity_tier}): ${productHits} kept, ${filtered} filtered`);
  }

  const items = Array.from(allItems.values());
  console.log(`  Total: ${items.length} unique HN items`);
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
