"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Star } from "lucide-react";
import type { Source } from "@/lib/types";

const SOURCE_CONFIG: Record<Source, { label: string; color: string }> = {
  g2: { label: "G2", color: "#FF492C" },
  capterra: { label: "Capterra", color: "#06BEE1" },
  reddit: { label: "Reddit", color: "#FF4500" },
  hackernews: { label: "HN", color: "#FF6600" },
  trustpilot: { label: "Trustpilot", color: "#00B67A" },
};

function SourceIcon({ source, size }: { source: Source; size: number }) {
  switch (source) {
    case "reddit":
    case "hackernews":
      return <MessageSquare size={size} />;
    case "trustpilot":
      return <Star size={size} />;
    default:
      return <Globe size={size} />;
  }
}

export function PlatformBadge({
  source,
  count,
  className,
}: {
  source: Source;
  count?: number;
  className?: string;
}) {
  const config = SOURCE_CONFIG[source];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      <SourceIcon source={source} size={12} />
      {config.label}
      {count !== undefined && (
        <span className="ml-0.5 opacity-75">({count})</span>
      )}
    </span>
  );
}
