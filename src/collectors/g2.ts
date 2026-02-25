import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";

const G2_API_HOST = "g2-products-reviews-users2.p.rapidapi.com";

async function fetchG2Reviews(productSlug: string): Promise<any[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log("  RAPIDAPI_KEY not set, skipping G2");
    return [];
  }

  try {
    const response = await fetch(
      `https://${G2_API_HOST}/product/${productSlug}/reviews?stars=1,2,3&sort=recent`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": G2_API_HOST,
        },
      }
    );

    if (!response.ok) {
      console.error(`  G2 API error: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("  G2 fetch failed:", error);
    return [];
  }
}

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "g2", status: "running" })
    .select("id")
    .single();

  try {
    // Get monitored categories with G2 URLs
    const { data: categories } = await supabase
      .from("monitored_categories")
      .select("g2_category_url")
      .eq("is_active", true)
      .not("g2_category_url", "is", null);

    console.log("Collecting from G2...");
    console.log(`  ${categories?.length || 0} categories with G2 URLs`);

    // For now, G2 collection requires knowing specific product slugs.
    // This is a placeholder — in practice you'd map category URLs to product slugs
    // via the RapidAPI endpoint or maintain a manual list.
    // The collector is structured for graceful degradation.

    let totalFound = 0;
    let newCount = 0;

    // TODO: Implement product slug discovery from G2 category pages
    // For now this collector runs but finds 0 items until configured with specific slugs

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`G2 collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("G2 collection failed:", error);
  }
}

main();
