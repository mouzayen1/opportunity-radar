"use client";

import { cn } from "@/lib/utils";
import { PAIN_CATEGORIES } from "@/lib/categories";
import type { PainCategory, ProductFilters, TrendingDirection } from "@/lib/types";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

const SORT_OPTIONS = [
  { value: "pain_score", label: "Pain Score" },
  { value: "disruption_score", label: "Disruption Score" },
  { value: "trending_delta", label: "Trending" },
  { value: "last_complaint_at", label: "Recent" },
] as const;

export function FilterSidebar({
  filters,
  onChange,
  categories,
  className,
}: {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  categories: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function update(partial: Partial<ProductFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  const painCategoryKeys = Object.keys(PAIN_CATEGORIES) as PainCategory[];

  const content = (
    <div className="flex flex-col gap-5">
      {/* Category */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Category
        </label>
        <select
          value={filters.category || ""}
          onChange={(e) => update({ category: e.target.value || undefined })}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Min Pain Score */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Min Pain Score: {filters.minPainScore || 0}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.minPainScore || 0}
          onChange={(e) => update({ minPainScore: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Min Disruption Score */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Min Disruption Score: {filters.minDisruptionScore || 0}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.minDisruptionScore || 0}
          onChange={(e) => update({ minDisruptionScore: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Platform Count */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Min Platforms
        </label>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => update({ minPlatformCount: n })}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                (filters.minPlatformCount || 0) === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-accent"
              )}
            >
              {n === 0 ? "Any" : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Pain Categories */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pain Category
        </label>
        <div className="flex flex-col gap-1.5">
          {painCategoryKeys.map((key) => {
            const def = PAIN_CATEGORIES[key];
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="painCategory"
                  checked={filters.painCategory === key}
                  onChange={() => update({ painCategory: key })}
                  className="accent-primary"
                />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: def.color }}
                />
                {def.label}
              </label>
            );
          })}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              name="painCategory"
              checked={!filters.painCategory}
              onChange={() => update({ painCategory: undefined })}
              className="accent-primary"
            />
            All
          </label>
        </div>
      </div>

      {/* Trending Filter */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Trending
        </label>
        <select
          value={filters.trendingDirection || ""}
          onChange={(e) =>
            update({
              trendingDirection: (e.target.value as TrendingDirection) || undefined,
            })
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All</option>
          <option value="rising">Rising Only</option>
          <option value="stable">Stable</option>
          <option value="falling">Falling</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sort By
        </label>
        <select
          value={filters.sortBy || "pain_score"}
          onChange={(e) => update({ sortBy: e.target.value as ProductFilters["sortBy"] })}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden w-64 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-4 lg:block",
          className
        )}
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">Filters</h3>
        {content}
      </aside>
    </>
  );
}
