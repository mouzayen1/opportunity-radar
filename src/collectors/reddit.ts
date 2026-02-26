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

const USER_AGENT = "PainRadar/3.0 (B2B software complaint discovery)";
const BASE_DELAY = 2000;

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

// Map product categories to relevant subreddits
const CATEGORY_SUBREDDITS: Record<string, string[]> = {
  "Field Service Management": ["HVAC", "Plumbing", "Electricians", "smallbusiness", "FieldServiceManagement"],
  "Accounting": ["Accounting", "Bookkeeping", "smallbusiness", "tax"],
  "CRM": ["sales", "CRM", "smallbusiness", "marketing"],
  "CRM / Marketing": ["sales", "CRM", "marketing", "smallbusiness", "digital_marketing"],
  "Help Desk": ["sysadmin", "CustomerSuccess", "smallbusiness", "ITManagers"],
  "Project Management": ["projectmanagement", "agile", "smallbusiness"],
  "POS / Payments": ["smallbusiness", "restaurateur", "retail", "PointOfSale"],
  "Restaurant POS": ["restaurateur", "KitchenConfidential", "PointOfSale", "smallbusiness"],
  "Conversational Marketing": ["marketing", "digital_marketing", "sales", "smallbusiness"],
  "Time Tracking": ["freelance", "smallbusiness", "consulting"],
  "Inventory Management": ["smallbusiness", "ecommerce", "Inventory", "supplychain"],
  "Team Communication": ["sysadmin", "smallbusiness", "projectmanagement"],
  "Payments": ["webdev", "startups", "smallbusiness", "ecommerce"],
  "Productivity": ["productivity", "projectmanagement", "smallbusiness"],
  "HR / Payroll": ["humanresources", "smallbusiness", "payroll"],
};

function getSubredditsForProduct(config: ProductSearchConfig): string[] {
  return CATEGORY_SUBREDDITS[config.category] || ["smallbusiness"];
}

/**
 * Build Reddit search queries based on ambiguity tier.
 * DANGEROUS products: only search unambiguous forms.
 */
function getRedditQueries(config: ProductSearchConfig): string[] {
  if (config.ambiguity_tier === "dangerous") {
    return config.unambiguous_forms;
  }
  return [config.canonical_name];
}

export async function collectFromReddit(options?: {
  maxProducts?: number;
}): Promise<RawComplaint[]> {
  console.log("Collecting from Reddit (5-layer defense)...");
  const allPosts = new Map<string, RawComplaint>();

  let configs = getAllProductConfigs();
  if (options?.maxProducts) {
    configs = configs.slice(0, options.maxProducts);
  }

  console.log(`  Searching for ${configs.length} products`);

  for (const config of configs) {
    let productHits = 0;
    let filtered = 0;
    const subreddits = getSubredditsForProduct(config);
    const queries = getRedditQueries(config);

    for (const query of queries) {
      for (const subreddit of subreddits) {
        const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&t=month&limit=25`;
        const data = await fetchWithRetry(url);

        if (data?.data?.children) {
          for (const child of data.data.children) {
            const post = child.data as RedditPost;
            const complaint = postToComplaint(post, config.canonical_name);
            if (allPosts.has(complaint.source_id)) continue;

            // Layer 3: Pre-AI text validation
            const fullText = `${complaint.title || ""} ${complaint.raw_text}`;
            const validation = validateProductMention(fullText, config);
            if (!validation.valid) {
              filtered++;
              continue;
            }

            allPosts.set(complaint.source_id, complaint);
            productHits++;
          }
        }

        await sleep(BASE_DELAY);
      }
    }

    console.log(`  ${config.canonical_name} (${config.ambiguity_tier}): ${productHits} kept, ${filtered} filtered`);
  }

  const items = Array.from(allPosts.values());
  console.log(`  Total: ${items.length} unique Reddit posts`);
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

if (require.main === module) {
  main();
}
