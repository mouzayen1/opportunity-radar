"use client";

import { cn } from "@/lib/utils";
import { PAIN_CATEGORIES } from "@/lib/categories";
import type { PainCategory } from "@/lib/types";

export function PainCategoryTags({
  categories,
  max,
  className,
}: {
  categories: PainCategory[];
  max?: number;
  className?: string;
}) {
  const displayed = max ? categories.slice(0, max) : categories;
  const remaining = max ? categories.length - max : 0;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {displayed.map((cat) => {
        const def = PAIN_CATEGORIES[cat];
        return (
          <span
            key={cat}
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${def.color}20`,
              color: def.color,
              border: `1px solid ${def.color}30`,
            }}
          >
            {def.label}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
