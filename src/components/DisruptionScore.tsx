"use client";

import { cn } from "@/lib/utils";

function getColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#34D399";
  if (score >= 40) return "#F59E0B";
  return "#6B7280";
}

function getLabel(score: number): string {
  if (score >= 80) return "High opportunity";
  if (score >= 60) return "Good opportunity";
  if (score >= 40) return "Moderate";
  return "Low";
}

export function DisruptionScore({
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
          Disruption
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
