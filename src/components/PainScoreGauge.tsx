"use client";

import { cn } from "@/lib/utils";

function getColor(score: number): string {
  if (score <= 30) return "#10B981";
  if (score <= 60) return "#F59E0B";
  if (score <= 80) return "#F97316";
  return "#EF4444";
}

function getLabel(score: number): string {
  if (score <= 30) return "Low";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "High";
  return "Critical";
}

export function PainScoreGauge({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color = getColor(score);
  const label = getLabel(score);
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };
  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("font-medium text-muted-foreground", textClasses[size])}>
          Pain
        </span>
        <span className={cn("font-bold", textClasses[size])} style={{ color }}>
          {score}
        </span>
      </div>
      <div className={cn("w-full rounded-full bg-muted", sizeClasses[size])}>
        <div
          className={cn("rounded-full transition-all", sizeClasses[size])}
          style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
        />
      </div>
      {size !== "sm" && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
