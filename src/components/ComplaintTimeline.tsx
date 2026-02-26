"use client";

import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Complaint } from "@/lib/types";

function groupByWeek(complaints: Complaint[]) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const weeks: Record<string, number> = {};

  // Initialize weeks
  for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 7)) {
    const key = d.toISOString().slice(0, 10);
    weeks[key] = 0;
  }

  complaints.forEach((c) => {
    if (!c.review_date) return;
    const date = new Date(c.review_date);
    if (date < ninetyDaysAgo) return;
    // Find the closest week start
    const diffDays = Math.floor(
      (date.getTime() - ninetyDaysAgo.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekIndex = Math.floor(diffDays / 7);
    const weekStart = new Date(ninetyDaysAgo);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);
    const key = weekStart.toISOString().slice(0, 10);
    if (key in weeks) {
      weeks[key]++;
    }
  });

  return Object.entries(weeks)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      complaints: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function ComplaintTimeline({
  complaints,
  className,
}: {
  complaints: Complaint[];
  className?: string;
}) {
  const data = groupByWeek(complaints);

  if (data.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No timeline data available
      </div>
    );
  }

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(var(--foreground))",
            }}
          />
          <Line
            type="monotone"
            dataKey="complaints"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ r: 3, fill: "#EF4444" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
