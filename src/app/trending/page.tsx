import { createServerClient } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { TrendingContent } from "./TrendingContent";

export const revalidate = 3600;

export default async function TrendingPage() {
  const supabase = createServerClient();

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [risingResult, newSignalsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("trending_direction", "rising")
      .gt("total_complaints", 0)
      .order("trending_delta", { ascending: false })
      .limit(50),
    supabase
      .from("products")
      .select("*")
      .gt("total_complaints", 0)
      .gte("first_seen_at", sevenDaysAgo)
      .order("pain_score", { ascending: false })
      .limit(20),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Trending</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Products with rising complaint volumes and new signals
        </p>
        <TrendingContent
          risingProducts={(risingResult.data || []) as Product[]}
          newSignals={(newSignalsResult.data || []) as Product[]}
        />
      </div>
    </main>
  );
}
