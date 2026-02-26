"use client";

import { cn } from "@/lib/utils";
import { Package, MessageSquareWarning, Gauge, TrendingUp } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function StatsBar({
  stats,
  className,
}: {
  stats: DashboardStats;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-4",
        className
      )}
    >
      <StatItem
        icon={Package}
        label="Total Products"
        value={stats.totalProducts}
        color="#3B82F6"
      />
      <StatItem
        icon={MessageSquareWarning}
        label="Total Complaints"
        value={stats.totalComplaints.toLocaleString()}
        color="#EF4444"
      />
      <StatItem
        icon={Gauge}
        label="Avg Pain Score"
        value={stats.avgPainScore}
        color="#F59E0B"
      />
      <StatItem
        icon={TrendingUp}
        label="Trending"
        value={stats.trendingCount}
        color="#10B981"
      />
    </div>
  );
}
