"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  ExternalLink,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from "lucide-react";
import type { Complaint, Product, ProductPainSummary, Source } from "@/lib/types";
import { PAIN_CATEGORIES } from "@/lib/categories";
import { PainScoreGauge } from "@/components/PainScoreGauge";
import { DisruptionScore } from "@/components/DisruptionScore";
import { TrendingIndicator } from "@/components/TrendingIndicator";
import { PlatformBadge } from "@/components/PlatformBadge";
import { PainCategoryTags } from "@/components/PainCategoryTags";
import { ComplaintTimeline } from "@/components/ComplaintTimeline";
import { CompetitorGap } from "@/components/CompetitorGap";
import { CrossPlatformIndicator } from "@/components/CrossPlatformIndicator";

const SOURCE_COLORS: Record<Source, string> = {
  g2: "#FF492C",
  capterra: "#06BEE1",
  reddit: "#FF4500",
  hackernews: "#FF6600",
  trustpilot: "#00B67A",
};

const COMPLAINTS_PER_PAGE = 10;

export function ProductDetail({
  product,
  complaints,
  painSummaries,
}: {
  product: Product;
  complaints: Complaint[];
  painSummaries: ProductPainSummary[];
}) {
  const [complaintPage, setComplaintPage] = useState(1);

  const priceRange =
    product.estimated_price_low && product.estimated_price_high
      ? `$${product.estimated_price_low}-$${product.estimated_price_high}/mo`
      : product.estimated_price_low
        ? `From $${product.estimated_price_low}/mo`
        : null;

  // Pain category chart data
  const painChartData = painSummaries.map((ps) => ({
    name: PAIN_CATEGORIES[ps.pain_category]?.label || ps.pain_category,
    mentions: ps.mention_count,
    avgSeverity: Math.round(ps.avg_severity * 10) / 10,
    fill: PAIN_CATEGORIES[ps.pain_category]?.color || "#6B7280",
  }));

  // Platform distribution data
  const platformCounts: Record<Source, number> = {
    g2: 0, capterra: 0, reddit: 0, hackernews: 0, trustpilot: 0,
  };
  complaints.forEach((c) => {
    if (c.source in platformCounts) platformCounts[c.source]++;
  });
  const platformData = (Object.entries(platformCounts) as [Source, number][])
    .filter(([, count]) => count > 0)
    .map(([source, count]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: count,
      color: SOURCE_COLORS[source],
    }));

  // Paginated complaints
  const totalComplaintPages = Math.ceil(complaints.length / COMPLAINTS_PER_PAGE);
  const paginatedComplaints = complaints.slice(
    (complaintPage - 1) * COMPLAINTS_PER_PAGE,
    complaintPage * COMPLAINTS_PER_PAGE
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Back */}
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {product.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {product.category && (
                  <span className="text-sm text-muted-foreground">
                    {product.category}
                  </span>
                )}
                {product.website && (
                  <a
                    href={product.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Website <ExternalLink size={12} />
                  </a>
                )}
                {priceRange && (
                  <span className="text-sm text-muted-foreground">
                    {priceRange}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <TrendingIndicator
                  direction={product.trending_direction}
                  delta={product.trending_delta}
                />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquareWarning size={12} />
                  {product.total_complaints} complaints
                </span>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-4 sm:w-64">
              <PainScoreGauge score={product.pain_score} size="lg" />
              <DisruptionScore score={product.disruption_score} size="lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pain Category Breakdown */}
          {painChartData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                Pain Category Breakdown
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={painChartData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
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
                    <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                      {painChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Platform Distribution */}
          {platformData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                Platform Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {platformData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3">
                <CrossPlatformIndicator complaints={complaints} />
              </div>
            </div>
          )}
        </div>

        {/* Complaint Timeline */}
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Complaint Timeline (90 days)
          </h2>
          <ComplaintTimeline complaints={complaints} />
        </div>

        {/* The Gap */}
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <CompetitorGap complaints={complaints} />
        </div>

        {/* Build This Summary */}
        {product.build_this_summary && (
          <div className="mt-6 rounded-lg border-2 border-green-500/30 bg-green-500/5 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-500">
              <Rocket size={16} />
              Build This
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {product.build_this_summary}
            </p>
          </div>
        )}

        {/* Raw Complaints Feed */}
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Complaints ({complaints.length})
          </h2>

          {paginatedComplaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No complaints found</p>
          ) : (
            <div className="space-y-3">
              {paginatedComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PlatformBadge source={complaint.source} />
                    {complaint.severity && (
                      <span className="text-xs text-muted-foreground">
                        Severity: {complaint.severity}/10
                      </span>
                    )}
                    {complaint.author_role && (
                      <span className="text-xs text-muted-foreground">
                        {complaint.author_role}
                      </span>
                    )}
                    {complaint.review_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(complaint.review_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {complaint.pain_summary && (
                    <p className="text-sm text-foreground">
                      {complaint.pain_summary}
                    </p>
                  )}
                  {complaint.pain_categories && (
                    <PainCategoryTags
                      categories={complaint.pain_categories}
                      className="mt-2"
                    />
                  )}
                  {complaint.source_url && (
                    <a
                      href={complaint.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View original <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Complaint Pagination */}
          {totalComplaintPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setComplaintPage((p) => Math.max(1, p - 1))}
                disabled={complaintPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs disabled:opacity-50"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {complaintPage} / {totalComplaintPages}
              </span>
              <button
                onClick={() =>
                  setComplaintPage((p) => Math.min(totalComplaintPages, p + 1))
                }
                disabled={complaintPage >= totalComplaintPages}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
