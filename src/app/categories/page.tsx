import { createServerClient } from "@/lib/supabase";
import { CategoriesGrid } from "./CategoriesGrid";

export const dynamic = "force-dynamic";

interface CategoryData {
  category: string;
  count: number;
  avgPainScore: number;
  topProducts: { name: string; slug: string; pain_score: number }[];
}

export default async function CategoriesPage() {
  const supabase = createServerClient();

  const { data: products } = await supabase
    .from("products")
    .select("name, slug, category, pain_score")
    .gt("total_complaints", 0)
    .order("pain_score", { ascending: false });

  if (!products || products.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">No categories found yet.</p>
        </div>
      </main>
    );
  }

  // Group by category
  const categoryMap = new Map<string, CategoryData>();
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        count: 0,
        avgPainScore: 0,
        topProducts: [],
      });
    }
    const entry = categoryMap.get(cat)!;
    entry.count++;
    entry.avgPainScore += p.pain_score || 0;
    if (entry.topProducts.length < 3) {
      entry.topProducts.push({
        name: p.name,
        slug: p.slug,
        pain_score: p.pain_score,
      });
    }
  });

  const categories = Array.from(categoryMap.values())
    .map((c) => ({
      ...c,
      avgPainScore: Math.round(c.avgPainScore / c.count),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Categories</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Browse software categories by pain level
        </p>
        <CategoriesGrid categories={categories} />
      </div>
    </main>
  );
}
