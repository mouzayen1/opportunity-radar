"use client";

import { cn } from "@/lib/utils";
import { PlatformBadge } from "./PlatformBadge";
import type { Complaint, Source } from "@/lib/types";

export function CrossPlatformIndicator({
  complaints,
  className,
}: {
  complaints: Complaint[];
  className?: string;
}) {
  const platformCounts: Record<Source, number> = {
    g2: 0,
    capterra: 0,
    reddit: 0,
    hackernews: 0,
    trustpilot: 0,
  };

  complaints.forEach((c) => {
    if (c.source in platformCounts) {
      platformCounts[c.source]++;
    }
  });

  const activePlatforms = (Object.entries(platformCounts) as [Source, number][]).filter(
    ([, count]) => count > 0
  );

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activePlatforms.map(([source, count]) => (
        <PlatformBadge key={source} source={source} count={count} />
      ))}
      {activePlatforms.length === 0 && (
        <span className="text-sm text-muted-foreground">No platform data</span>
      )}
    </div>
  );
}
