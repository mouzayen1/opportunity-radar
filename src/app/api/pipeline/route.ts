import { NextResponse } from "next/server";
import { collectFromHackerNews } from "@/collectors/hackernews";
import { collectFromReddit } from "@/collectors/reddit";
import { runStage2 } from "@/collectors/stage2-extract";
import { runStage3 } from "@/collectors/stage3-score";
import { createServerClient } from "@/lib/supabase";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createServerClient();
  const steps: { step: string; result: string }[] = [];

  try {
    // Record collection run
    const { data: run } = await supabase
      .from("collection_runs")
      .insert({ source: "manual", status: "running" })
      .select("id")
      .single();

    // Stage 1a: Collect from HackerNews
    let hnCount = 0;
    try {
      const hnComplaints = await collectFromHackerNews();
      hnCount = hnComplaints.length;
      steps.push({ step: "HackerNews", result: `${hnCount} complaints collected` });
    } catch (err: any) {
      steps.push({ step: "HackerNews", result: `Error: ${err.message}` });
    }

    // Stage 1b: Collect from Reddit
    let redditCount = 0;
    try {
      const redditComplaints = await collectFromReddit();
      redditCount = redditComplaints.length;
      steps.push({ step: "Reddit", result: `${redditCount} complaints collected` });
    } catch (err: any) {
      steps.push({ step: "Reddit", result: `Error: ${err.message}` });
    }

    // Stage 2: AI extraction
    try {
      const stage2 = await runStage2();
      steps.push({
        step: "AI Extraction",
        result: `${stage2.analyzed} analyzed, ${stage2.linked} linked to products`,
      });
    } catch (err: any) {
      steps.push({ step: "AI Extraction", result: `Error: ${err.message}` });
    }

    // Stage 3: Scoring
    try {
      const stage3 = await runStage3();
      steps.push({
        step: "Scoring",
        result: `${stage3.scored} products scored`,
      });
    } catch (err: any) {
      steps.push({ step: "Scoring", result: `Error: ${err.message}` });
    }

    // Update collection run
    if (run?.id) {
      await supabase
        .from("collection_runs")
        .update({
          status: "completed",
          items_found: hnCount + redditCount,
          items_new: hnCount + redditCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    return NextResponse.json({ success: true, steps });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, steps },
      { status: 500 }
    );
  }
}
