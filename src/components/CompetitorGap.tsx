"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, Target, Users } from "lucide-react";
import type { Complaint } from "@/lib/types";

export function CompetitorGap({
  complaints,
  className,
}: {
  complaints: Complaint[];
  className?: string;
}) {
  // Aggregate wishes
  const wishes = complaints
    .map((c) => c.wishes)
    .filter(Boolean) as string[];

  // Aggregate feature gaps
  const gapCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    c.specific_feature_gaps?.forEach((gap) => {
      const key = gap.toLowerCase().trim();
      gapCounts[key] = (gapCounts[key] || 0) + 1;
    });
  });
  const topGaps = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Aggregate competitor mentions
  const compCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    c.competitor_mentions?.forEach((comp) => {
      const key = comp.trim();
      compCounts[key] = (compCounts[key] || 0) + 1;
    });
  });
  const topCompetitors = Object.entries(compCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (wishes.length === 0 && topGaps.length === 0 && topCompetitors.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <h3 className="text-lg font-semibold text-foreground">The Gap</h3>

      {/* Wishes */}
      {wishes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Lightbulb size={16} className="text-yellow-500" />
            What users wish for
          </div>
          <ul className="space-y-1.5 pl-6">
            {wishes.slice(0, 8).map((wish, i) => (
              <li
                key={i}
                className="list-disc text-sm text-muted-foreground"
              >
                {wish}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feature Gaps */}
      {topGaps.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Target size={16} className="text-blue-500" />
            Specific feature gaps
          </div>
          <ul className="space-y-1.5 pl-6">
            {topGaps.map(([gap, count]) => (
              <li
                key={gap}
                className="list-disc text-sm text-muted-foreground"
              >
                {gap}{" "}
                <span className="text-xs opacity-60">({count} mentions)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competitor Mentions */}
      {topCompetitors.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Users size={16} className="text-purple-500" />
            Competitor mentions
          </div>
          <ul className="space-y-1.5 pl-6">
            {topCompetitors.map(([comp, count]) => (
              <li
                key={comp}
                className="list-disc text-sm text-muted-foreground"
              >
                {comp}{" "}
                <span className="text-xs opacity-60">({count} mentions)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
