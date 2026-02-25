import { Complaint } from "./types";

export interface ProductScores {
  painScore: number;
  disruptionScore: number;
  platformCount: number;
  trendingDirection: "rising" | "falling" | "stable";
  trendingDelta: number;
}

export function calculateProductScores(complaints: Complaint[]): ProductScores {
  if (complaints.length === 0) {
    return { painScore: 0, disruptionScore: 0, platformCount: 0, trendingDirection: "stable", trendingDelta: 0 };
  }

  const now = Date.now();

  // ---- PAIN SCORE (0-100) ----

  // 1. Volume (25 pts max)
  const volumeScore = Math.min(25, Math.log10(complaints.length + 1) * 12.5);

  // 2. Severity (25 pts max)
  const avgSeverity =
    complaints.reduce((sum, c) => sum + (c.severity || 5), 0) / complaints.length;
  const severityScore = (avgSeverity / 10) * 25;

  // 3. Platform spread (25 pts max)
  const platforms = new Set(complaints.map((c) => c.source));
  const spreadPoints: Record<number, number> = { 1: 5, 2: 12, 3: 18, 4: 22, 5: 25 };
  const platformScore = spreadPoints[Math.min(platforms.size, 5)] || 25;

  // 4. Recency (25 pts max)
  const recencyWeights = complaints.map((c) => {
    const age = c.review_date
      ? (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24)
      : 90;
    if (age < 30) return 1;
    if (age < 90) return 0.5;
    return 0.25;
  });
  const recencyScore =
    (recencyWeights.reduce((a, b) => a + b, 0) / complaints.length) * 25;

  const painScore = Math.round(
    Math.min(100, volumeScore + severityScore + platformScore + recencyScore)
  );

  // ---- DISRUPTION SCORE (0-100) ----

  // 1. Switching intent (30 pts)
  const switchingComplaints = complaints.filter(
    (c) => c.switching_intent === "actively_looking" || c.switching_intent === "considering"
  );
  const switchingScore = Math.min(
    30,
    (switchingComplaints.length / complaints.length) * 30
  );

  // 2. Pricing complaints (25 pts)
  const pricingComplaints = complaints.filter((c) =>
    c.pain_categories?.includes("pricing")
  );
  const pricingScore = Math.min(
    25,
    (pricingComplaints.length / complaints.length) * 30
  );

  // 3. Feature gap specificity (25 pts)
  const featureGaps = complaints.flatMap((c) => c.specific_feature_gaps || []);
  const uniqueGaps = new Set(featureGaps);
  const gapScore = Math.min(25, uniqueGaps.size * 3);

  // 4. Market accessibility (20 pts)
  const smbComplaints = complaints.filter(
    (c) => c.user_segment === "small_business" || c.user_segment === "freelancer"
  );
  const marketScore = Math.min(
    20,
    (smbComplaints.length / complaints.length) * 25
  );

  const disruptionScore = Math.round(
    Math.min(100, switchingScore + pricingScore + gapScore + marketScore)
  );

  // ---- TRENDING ----

  const last30 = complaints.filter((c) => {
    if (!c.review_date) return false;
    const age = (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24);
    return age < 30;
  }).length;

  const prev30 = complaints.filter((c) => {
    if (!c.review_date) return false;
    const age = (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24);
    return age >= 30 && age < 60;
  }).length;

  const trendingDelta = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : 0;
  const trendingDirection =
    trendingDelta > 15 ? "rising" : trendingDelta < -15 ? "falling" : "stable";

  return {
    painScore,
    disruptionScore,
    platformCount: platforms.size,
    trendingDirection,
    trendingDelta: Math.round(trendingDelta),
  };
}
