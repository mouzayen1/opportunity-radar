import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Complaint, Product, ProductPainSummary } from "@/lib/types";
import { ProductDetail } from "./ProductDetail";

export const revalidate = 3600;

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerClient();

  // Fetch product by slug
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!product) {
    notFound();
  }

  // Fetch complaints and pain summaries in parallel
  const [complaintsResult, painSummaryResult] = await Promise.all([
    supabase
      .from("complaints")
      .select("*")
      .eq("product_id", product.id)
      .eq("analyzed", true)
      .order("review_date", { ascending: false })
      .limit(200),
    supabase
      .from("product_pain_summary")
      .select("*")
      .eq("product_id", product.id)
      .order("mention_count", { ascending: false }),
  ]);

  return (
    <ProductDetail
      product={product as Product}
      complaints={(complaintsResult.data || []) as Complaint[]}
      painSummaries={(painSummaryResult.data || []) as ProductPainSummary[]}
    />
  );
}
