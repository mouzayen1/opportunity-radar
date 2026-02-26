import { NextRequest, NextResponse } from "next/server";
import { collectFromHackerNews } from "@/collectors/hackernews";
import { collectFromReddit } from "@/collectors/reddit";
import { runStage2 } from "@/collectors/stage2-extract";
import { runStage3 } from "@/collectors/stage3-score";
import { createServerClient } from "@/lib/supabase";
import { findOrCreateProduct } from "@/lib/normalize";
import { RawComplaint } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Generic terms that should NOT be pre-linked as product names
const GENERIC_TERM_PATTERNS = /\b(software|tool|system|platform|alternative|management|solution)\b/i;

function isLikelyProductName(term: string): boolean {
  return !GENERIC_TERM_PATTERNS.test(term);
}

async function saveComplaints(items: RawComplaint[], source: string) {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source, status: "running" })
    .select("id")
    .single();

  // Pre-resolve product IDs for items with target_product
  const productIdCache = new Map<string, string>();
  const termsToResolve = new Set<string>();
  for (const item of items) {
    if (item.target_product && isLikelyProductName(item.target_product)) {
      termsToResolve.add(item.target_product);
    }
  }

  for (const term of termsToResolve) {
    try {
      const product = await findOrCreateProduct(term);
      productIdCache.set(term, product.id);
    } catch (err) {
      console.error(`  Failed to resolve product for "${term}":`, err);
    }
  }

  // Batch insert in chunks of 50 for speed
  let newCount = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE).map((item) => {
      const productId = item.target_product
        ? productIdCache.get(item.target_product) || null
        : null;

      return {
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
        ...(productId ? { product_id: productId } : {}),
      };
    });

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

  const preLinked = items.filter(
    (i) => i.target_product && productIdCache.has(i.target_product)
  ).length;

  return { found: items.length, saved: newCount, preLinked };
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") || "all";

  try {
    switch (stage) {
      case "hn": {
        const items = await collectFromHackerNews({
          maxProducts: 10,
        });
        const result = await saveComplaints(items, "hackernews");
        return NextResponse.json({
          success: true,
          stage: "HackerNews Collection",
          result: `${result.found} found, ${result.saved} new, ${result.preLinked} pre-linked`,
        });
      }

      case "reddit": {
        const items = await collectFromReddit({
          maxProducts: 5,
        });
        const result = await saveComplaints(items, "reddit");
        return NextResponse.json({
          success: true,
          stage: "Reddit Collection",
          result: `${result.found} found, ${result.saved} new, ${result.preLinked} pre-linked`,
        });
      }

      case "extract": {
        // Loop extract batches until done or approaching 60s timeout
        const startTime = Date.now();
        let totalAnalyzed = 0;
        let totalLinked = 0;
        let batches = 0;
        while (Date.now() - startTime < 45_000) { // stop at 45s to leave margin
          const result = await runStage2({ maxItems: 20 });
          totalAnalyzed += result.analyzed;
          totalLinked += result.linked;
          batches++;
          if (result.analyzed === 0) break; // nothing left to process
        }
        return NextResponse.json({
          success: true,
          stage: "AI Extraction",
          result: `${totalAnalyzed} analyzed, ${totalLinked} linked (${batches} batches)`,
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

      case "reset": {
        const supabase = createServerClient();
        // Delete all complaints and products, start fresh
        await supabase.from("complaints").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("product_pain_summary").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("collection_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        return NextResponse.json({
          success: true,
          stage: "Reset",
          result: "All complaints, products, and collection runs cleared",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Use ?stage=hn|reddit|extract|score|reset" },
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
