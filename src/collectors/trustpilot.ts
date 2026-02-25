import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import * as cheerio from "cheerio";
import { sleep } from "../lib/utils";

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "trustpilot", status: "running" })
    .select("id")
    .single();

  try {
    console.log("Collecting from Trustpilot...");
    console.log("  Note: Trustpilot uses bot detection. This collector may fail gracefully.");

    let totalFound = 0;
    let newCount = 0;

    // Trustpilot embeds JSON-LD structured data in their review pages.
    // This collector is structured for graceful degradation.
    // TODO: Implement JSON-LD extraction once we identify the schema.

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`Trustpilot collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Trustpilot collection failed (graceful):", error);
  }
}

main();
