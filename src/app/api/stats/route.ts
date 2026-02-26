import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerClient();

  const [productsResult, complaintsResult, avgResult, trendingResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .gt("total_complaints", 0),
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("analyzed", true)
        .not("product_id", "is", null),
      supabase
        .from("products")
        .select("pain_score")
        .gt("total_complaints", 0),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("trending_direction", "rising"),
    ]);

  const avgPainScore = avgResult.data
    ? Math.round(
        avgResult.data.reduce(
          (s: number, p: { pain_score: number }) => s + (p.pain_score || 0),
          0
        ) / (avgResult.data.length || 1)
      )
    : 0;

  return NextResponse.json({
    totalProducts: productsResult.count || 0,
    totalComplaints: complaintsResult.count || 0,
    avgPainScore,
    trendingCount: trendingResult.count || 0,
  });
}
