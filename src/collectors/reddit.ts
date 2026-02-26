import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import { sleep } from "../lib/utils";

const USER_AGENT = "PainRadar/3.0 (B2B software complaint discovery)";
const BASE_DELAY = 2000;

// Generic terms to skip — only search for actual product names
const GENERIC_TERM_PATTERNS = /\b(software|tool|system|platform|alternative|management|solution)\b/i;

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  author: string;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<any | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.ok) return response.json();

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 2000;
        console.log(`  Rate limited, waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      console.error(`  Reddit API error: ${response.status}`);
      return null;
    } catch (error) {
      console.error("  Reddit fetch error:", error);
      if (i < maxRetries - 1) await sleep(2000);
    }
  }
  return null;
}

function postToComplaint(post: RedditPost, targetProduct: string): RawComplaint {
  return {
    source: "reddit",
    source_id: `${post.subreddit}_${post.id}`,
    source_url: `https://reddit.com${post.permalink}`,
    title: post.title,
    raw_text: post.selftext || "",
    author: post.author || null,
    author_role: null,
    author_company_size: null,
    star_rating: null,
    review_date: new Date(post.created_utc * 1000),
    target_product: targetProduct,
  };
}

interface CategoryConfig {
  name: string;
  subreddits: string[];
  hn_search_terms: string[];
}

async function getCategoriesFromDB(): Promise<CategoryConfig[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("monitored_categories")
    .select("name, subreddits, hn_search_terms")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  return (data as CategoryConfig[]) || [];
}

export async function collectFromReddit(options?: { maxProducts?: number }): Promise<RawComplaint[]> {
  console.log("Collecting from Reddit (product-centric)...");
  const allPosts = new Map<string, RawComplaint>();

  const categories = await getCategoriesFromDB();

  // Build product name → subreddits pairs, skipping generic terms
  const pairMap = new Map<string, Set<string>>();
  for (const cat of categories) {
    for (const term of cat.hn_search_terms || []) {
      if (GENERIC_TERM_PATTERNS.test(term)) continue; // skip generic
      if (!pairMap.has(term)) pairMap.set(term, new Set());
      for (const sub of cat.subreddits || []) {
        pairMap.get(term)!.add(sub);
      }
    }
  }

  let productTerms = [...pairMap.keys()];
  if (options?.maxProducts) {
    productTerms = productTerms.slice(0, options.maxProducts);
  }

  let totalSearches = 0;
  for (const term of productTerms) {
    totalSearches += pairMap.get(term)!.size;
  }
  console.log(`  Searching ${productTerms.length} products across ${totalSearches} subreddit pairs`);

  for (const term of productTerms) {
    const subreddits = pairMap.get(term)!;

    for (const subreddit of subreddits) {
      console.log(`  r/${subreddit}: "${term}"`);

      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&restrict_sr=on&sort=new&t=year&limit=50`;
      const data = await fetchWithRetry(url);

      if (data?.data?.children) {
        for (const child of data.data.children) {
          const post = child.data as RedditPost;
          const complaint = postToComplaint(post, term);
          if (!allPosts.has(complaint.source_id)) {
            allPosts.set(complaint.source_id, complaint);
          }
        }
      }

      await sleep(BASE_DELAY);
    }
  }

  const items = Array.from(allPosts.values());
  console.log(`  Found ${items.length} unique Reddit posts across ${productTerms.length} products`);
  return items;
}

// Main: run standalone
async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "reddit", status: "running" })
    .select("id")
    .single();

  try {
    const items = await collectFromReddit();

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

    console.log(`Reddit collection complete: ${items.length} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Reddit collection failed:", error);
    process.exit(1);
  }
}

main();
