import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  const productId = params.get("productId");
  const source = params.get("source");
  const page = Number(params.get("page")) || 1;
  const pageSize = Math.min(Number(params.get("pageSize")) || 20, 50);

  let query = supabase
    .from("complaints")
    .select("*", { count: "exact" })
    .eq("analyzed", true)
    .not("product_id", "is", null);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  if (source) {
    query = query.eq("source", source);
  }

  query = query.order("review_date", { ascending: false });

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
