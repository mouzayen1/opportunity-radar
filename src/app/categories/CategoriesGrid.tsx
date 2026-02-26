"use client";

import Link from "next/link";
import { PainScoreGauge } from "@/components/PainScoreGauge";

interface CategoryData {
  category: string;
  count: number;
  avgPainScore: number;
  topProducts: { name: string; slug: string; pain_score: number }[];
}

export function CategoriesGrid({
  categories,
}: {
  categories: CategoryData[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => (
        <Link
          key={cat.category}
          href={`/?category=${encodeURIComponent(cat.category)}`}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {cat.category}
              </h3>
              <p className="text-xs text-muted-foreground">
                {cat.count} product{cat.count !== 1 ? "s" : ""}
              </p>
            </div>
            <PainScoreGauge score={cat.avgPainScore} size="sm" className="w-20" />
          </div>

          {cat.topProducts.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Most complained
              </p>
              <div className="space-y-1">
                {cat.topProducts.map((p) => (
                  <div
                    key={p.slug}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-foreground">{p.name}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {p.pain_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
