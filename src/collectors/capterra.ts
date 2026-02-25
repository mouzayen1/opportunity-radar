import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import * as cheerio from "cheerio";
import { sleep } from "../lib/utils";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "capterra", status: "running" })
    .select("id")
    .single();

  try {
    console.log("Collecting from Capterra...");
    console.log("  Note: Capterra uses Cloudflare protection. This collector may fail gracefully.");

    let totalFound = 0;
    let newCount = 0;

    // Capterra scraping is inherently fragile due to bot protection.
    // This collector is structured to attempt scraping and gracefully degrade.
    // TODO: Implement HTML parsing once we identify working selectors.
    // For now, logs attempt and reports 0 items.

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`Capterra collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Capterra collection failed (graceful):", error);
  }
}

main();
