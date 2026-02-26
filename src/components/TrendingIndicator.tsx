"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { TrendingDirection } from "@/lib/types";

export function TrendingIndicator({
  direction,
  delta,
  className,
}: {
  direction: TrendingDirection;
  delta: number;
  className?: string;
}) {
  const config = {
    rising: {
      icon: TrendingUp,
      color: "text-red-500",
      label: "Rising",
    },
    falling: {
      icon: TrendingDown,
      color: "text-green-500",
      label: "Falling",
    },
    stable: {
      icon: ArrowRight,
      color: "text-muted-foreground",
      label: "Stable",
    },
  };

  const { icon: Icon, color, label } = config[direction];
  const deltaDisplay = delta > 0 ? `+${delta}%` : `${delta}%`;

  return (
    <div className={cn("inline-flex items-center gap-1", color, className)}>
      <Icon size={14} />
      <span className="text-xs font-medium">{label}</span>
      {delta !== 0 && (
        <span className="text-xs opacity-75">{deltaDisplay}</span>
      )}
    </div>
  );
}
