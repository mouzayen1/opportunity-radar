import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  const search = params.get("search");
  const category = params.get("category");
  const minPainScore = Number(params.get("minPainScore")) || 0;
  const minDisruptionScore = Number(params.get("minDisruptionScore")) || 0;
  const minPlatformCount = Number(params.get("minPlatformCount")) || 0;
  const painCategory = params.get("painCategory");
  const trendingDirection = params.get("trendingDirection");
  const sortBy = params.get("sortBy") || "pain_score";
  const page = Number(params.get("page")) || 1;
  const pageSize = Math.min(Number(params.get("pageSize")) || 20, 50);

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .gte("pain_score", minPainScore)
    .gte("disruption_score", minDisruptionScore)
    .gte("platform_count", minPlatformCount)
    .gt("total_complaints", 0);

  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (trendingDirection && trendingDirection !== "all") {
    query = query.eq("trending_direction", trendingDirection);
  }

  // Sort
  const sortColumn = [
    "pain_score",
    "disruption_score",
    "trending_delta",
    "last_complaint_at",
  ].includes(sortBy)
    ? sortBy
    : "pain_score";
  query = query.order(sortColumn, { ascending: false });

  // Paginate
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  });
}
