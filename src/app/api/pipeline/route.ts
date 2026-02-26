import { NextRequest, NextResponse } from "next/server";
import { collectFromHackerNews } from "@/collectors/hackernews";
import { collectFromReddit } from "@/collectors/reddit";
import { runStage2 } from "@/collectors/stage2-extract";
import { runStage3 } from "@/collectors/stage3-score";
import { createServerClient } from "@/lib/supabase";
import { RawComplaint } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function saveComplaints(items: RawComplaint[], source: string) {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source, status: "running" })
    .select("id")
    .single();

  // Batch insert in chunks of 50 for speed
  let newCount = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE).map((item) => ({
      source: item.source,
      source_id: item.source_id,
      source_url: item.source_url,
      title: item.title,
      raw_text: (item.raw_text || "").substring(0, 2000),
      author: item.author,
      review_date:
        item.review_date instanceof Date
          ? item.review_date.toISOString()
          : item.review_date,
      analyzed: false,
    }));

    const { data } = await supabase
      .from("complaints")
      .upsert(batch, { onConflict: "source,source_id", ignoreDuplicates: true })
      .select("id");

    newCount += data?.length || 0;
  }

  if (run?.id) {
    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: items.length,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
  }

  return { found: items.length, saved: newCount };
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") || "all";

  try {
    switch (stage) {
      case "hn": {
        // Limit to 5 queries, skip slow category term lookups
        const items = await collectFromHackerNews({
          maxQueries: 5,
          skipCategoryTerms: true,
        });
        const result = await saveComplaints(items, "hackernews");
        return NextResponse.json({
          success: true,
          stage: "HackerNews Collection",
          result: `${result.found} found, ${result.saved} new`,
        });
      }

      case "reddit": {
        // Limit to 5 subreddits and 3 queries to fit within 60s
        const items = await collectFromReddit({
          maxSubreddits: 5,
          maxQueries: 3,
        });
        const result = await saveComplaints(items, "reddit");
        return NextResponse.json({
          success: true,
          stage: "Reddit Collection",
          result: `${result.found} found, ${result.saved} new`,
        });
      }

      case "extract": {
        const result = await runStage2();
        return NextResponse.json({
          success: true,
          stage: "AI Extraction",
          result: `${result.analyzed} analyzed, ${result.linked} linked`,
        });
      }

      case "score": {
        const result = await runStage3();
        return NextResponse.json({
          success: true,
          stage: "Scoring",
          result: `${result.scored} products scored`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Use ?stage=hn|reddit|extract|score" },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, stage, error: err.message },
      { status: 500 }
    );
  }
}
