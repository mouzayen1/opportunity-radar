import { Opportunity, ComplaintType } from './types';

/**
 * Calculate recency score based on how recently the item was posted
 * Newer items score higher
 */
export function calculateRecencyScore(postedAt: Date): number {
  const now = new Date();
  const ageInDays = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 1) return 100;
  if (ageInDays <= 3) return 90;
  if (ageInDays <= 7) return 80;
  if (ageInDays <= 14) return 70;
  if (ageInDays <= 30) return 60;
  if (ageInDays <= 60) return 40;
  if (ageInDays <= 90) return 20;
  return 10;
}

/**
 * Calculate replacement score for MAKE_IT_BETTER opportunities
 * Based on complaint type - some complaints indicate easier replacement
 */
export function calculateReplacementScore(complaintType?: ComplaintType): number {
  if (!complaintType) return 50;

  const scores: Record<ComplaintType, number> = {
    pricing: 85,           // High - price-sensitive users switch easily
    complexity: 80,        // High - users frustrated by complexity want simpler
    missing_feature: 70,   // Medium-high - specific unmet needs
    performance: 65,       // Medium - users tolerate if no alternatives
    support: 60,           // Medium - users stick around if product works
    reliability: 55,       // Medium-low - risk-averse about switching
    other: 50,            // Default
  };

  return scores[complaintType];
}

/**
 * Calculate overall score for GREENFIELD opportunities
 * Weights: pain (30%), market (25%), feasibility (25%), urgency (10%), recency (10%)
 */
export function scoreGreenfield(opportunity: Partial<Opportunity>): number {
  const pain = opportunity.pain_score ?? 50;
  const market = opportunity.market_score ?? 50;
  const feasibility = opportunity.feasibility_score ?? 50;
  const urgency = opportunity.urgency_score ?? 50;
  const recency = opportunity.recency_score ?? 50;

  return Math.round(
    pain * 0.30 +
    market * 0.25 +
    feasibility * 0.25 +
    urgency * 0.10 +
    recency * 0.10
  );
}

/**
 * Calculate overall score for MAKE_IT_BETTER opportunities
 * Weights: pain (25%), market (20%), feasibility (20%), replacement (20%), urgency (10%), recency (5%)
 */
export function scoreMakeItBetter(opportunity: Partial<Opportunity>): number {
  const pain = opportunity.pain_score ?? 50;
  const market = opportunity.market_score ?? 50;
  const feasibility = opportunity.feasibility_score ?? 50;
  const replacement = opportunity.replacement_score ?? 50;
  const urgency = opportunity.urgency_score ?? 50;
  const recency = opportunity.recency_score ?? 50;

  return Math.round(
    pain * 0.25 +
    market * 0.20 +
    feasibility * 0.20 +
    replacement * 0.20 +
    urgency * 0.10 +
    recency * 0.05
  );
}

/**
 * Calculate all scores for an opportunity
 */
export function calculateAllScores(opportunity: Partial<Opportunity>): {
  recency_score: number;
  replacement_score: number | undefined;
  overall_score: number;
} {
  const recency_score = calculateRecencyScore(opportunity.posted_at ?? new Date());

  const isGreenfield = opportunity.opportunity_type === 'GREENFIELD';

  const replacement_score = isGreenfield
    ? undefined
    : calculateReplacementScore(opportunity.complaint_type);

  const opportunityWithScores = {
    ...opportunity,
    recency_score,
    replacement_score,
  };

  const overall_score = isGreenfield
    ? scoreGreenfield(opportunityWithScores)
    : scoreMakeItBetter(opportunityWithScores);

  return {
    recency_score,
    replacement_score,
    overall_score,
  };
}
