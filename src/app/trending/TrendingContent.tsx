"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { PainScoreGauge } from "@/components/PainScoreGauge";
import { DisruptionScore } from "@/components/DisruptionScore";
import { TrendingIndicator } from "@/components/TrendingIndicator";
import { Flame, Sparkles, MessageSquareWarning } from "lucide-react";

function TrendingCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">
            {product.name}
          </h3>
          {product.category && (
            <span className="text-xs text-muted-foreground">
              {product.category}
            </span>
          )}
        </div>
        <TrendingIndicator
          direction={product.trending_direction}
          delta={product.trending_delta}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PainScoreGauge score={product.pain_score} size="sm" />
        <DisruptionScore score={product.disruption_score} size="sm" />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageSquareWarning size={12} />
        {product.total_complaints} complaints
      </div>
    </Link>
  );
}

export function TrendingContent({
  risingProducts,
  newSignals,
}: {
  risingProducts: Product[];
  newSignals: Product[];
}) {
  return (
    <div className="space-y-8">
      {/* Rising */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Flame size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Rising Complaints
          </h2>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
            {risingProducts.length}
          </span>
        </div>
        {risingProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products with rising complaint trends right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {risingProducts.map((p) => (
              <TrendingCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* New Signals */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-500" />
          <h2 className="text-lg font-semibold text-foreground">
            New Signals (Last 7 Days)
          </h2>
          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
            {newSignals.length}
          </span>
        </div>
        {newSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new products discovered in the last 7 days.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newSignals.map((p) => (
              <TrendingCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
