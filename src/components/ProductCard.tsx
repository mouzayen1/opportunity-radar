"use client";

import { cn } from "@/lib/utils";
import { MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { PainScoreGauge } from "./PainScoreGauge";
import { DisruptionScore } from "./DisruptionScore";
import { PlatformBadge } from "./PlatformBadge";
import { PainCategoryTags } from "./PainCategoryTags";
import { TrendingIndicator } from "./TrendingIndicator";

const ALL_SOURCES = ["g2", "capterra", "reddit", "hackernews", "trustpilot"] as const;

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const priceRange =
    product.estimated_price_low && product.estimated_price_high
      ? `$${product.estimated_price_low}-$${product.estimated_price_high}/mo`
      : product.estimated_price_low
        ? `From $${product.estimated_price_low}/mo`
        : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/product/${product.slug}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {product.name}
          </Link>
          {product.category && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {product.category}
            </span>
          )}
        </div>
        <TrendingIndicator
          direction={product.trending_direction}
          delta={product.trending_delta}
        />
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <PainScoreGauge score={product.pain_score} size="sm" />
        <DisruptionScore score={product.disruption_score} size="sm" />
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1">
        {ALL_SOURCES.filter(() => product.platform_count > 0).map((src) => (
          <PlatformBadge key={src} source={src} />
        )).slice(0, product.platform_count)}
      </div>

      {/* Pain Categories */}
      {product.build_this_summary && (
        <PainCategoryTags
          categories={[]}
          max={3}
        />
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareWarning size={12} />
          {product.total_complaints} complaints
        </div>
        {priceRange && (
          <span className="text-xs text-muted-foreground">{priceRange}</span>
        )}
      </div>

      {/* Build-this summary */}
      {product.build_this_summary && (
        <p className="text-xs text-muted-foreground line-clamp-1 italic">
          {product.build_this_summary}
        </p>
      )}
    </div>
  );
}
