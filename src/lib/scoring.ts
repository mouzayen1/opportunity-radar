/**
 * 5-Dimension Scoring Algorithm for OpportunityRadar v4
 *
 * Scores each RawOpportunity on 5 dimensions (max 100 points total):
 *   1. Demand Signal   (0-30)
 *   2. Recency          (0-20)
 *   3. Buildability     (0-20)
 *   4. Source Quality    (0-15)
 *   5. Market Signal     (0-15)
 */

import type { RawOpportunity, ScoredOpportunity } from '@/types'

// ---------------------------------------------------------------------------
// 1. DEMAND SIGNAL (0-30 points)
// ---------------------------------------------------------------------------

function scoreDemand(opp: RawOpportunity): number {
  // Explicit willingness to pay is the strongest signal
  if (opp.willingness_to_pay) {
    return 30
  }

  // Fall back to engagement level
  switch (opp.engagement) {
    case 'high':
      return 20
    case 'medium':
      return 10
    case 'low':
      return 3
    default:
      return 3
  }
}

// ---------------------------------------------------------------------------
// 2. RECENCY (0-20 points)
// ---------------------------------------------------------------------------

function scoreRecency(opp: RawOpportunity): number {
  const days = opp.recency

  if (days <= 7) return 20
  if (days <= 30) return 14
  if (days <= 90) return 8
  return 3
}

// ---------------------------------------------------------------------------
// 3. BUILDABILITY (0-20 points)
// ---------------------------------------------------------------------------

function scoreBuildability(opp: RawOpportunity): number {
  const isGreenfield = opp.type === 'greenfield'
  const isHard = opp.buildComplexity === 'hard'
  const competitorCount = opp.competitors?.length ?? 0
  const fewCompetitors = competitorCount <= 2

  if (isGreenfield && !isHard) return 20
  if (isGreenfield && isHard) return 14
  if (!isGreenfield && fewCompetitors) return 16
  if (!isGreenfield && !fewCompetitors) return 8

  return 8
}

// ---------------------------------------------------------------------------
// 4. SOURCE QUALITY (0-15 points)
// ---------------------------------------------------------------------------

function scoreSourceQuality(opp: RawOpportunity): number {
  const source = opp.source
  const points = opp.points ?? 0

  if (source === 'hackernews' && points >= 50) return 15
  if (source === 'reddit' && points >= 20) return 13
  if (source === 'hackernews') return 10
  if (source === 'github') return 9
  if (source === 'reddit') return 8

  // ai_mission, stackoverflow, devto, lobsters, producthunt, indiehackers
  // For AI missions, we use a moderate baseline since the data reflects
  // patterns the model has seen across millions of real discussions.
  if (source === 'ai_mission') return 7
  if (source === 'stackoverflow') return 8
  if (source === 'indiehackers') return 8
  if (source === 'producthunt') return 7
  if (source === 'lobsters') return 7
  if (source === 'devto') return 6

  return 4
}

// ---------------------------------------------------------------------------
// 5. MARKET SIGNAL (0-15 points)
// ---------------------------------------------------------------------------

function scoreMarketSignal(opp: RawOpportunity): number {
  const hasIndustry = !!opp.industry
  const hasTargetUser = !!opp.targetUser
  const hasSubreddit = !!opp.subreddit

  if (hasIndustry || hasTargetUser) return 15
  if (hasSubreddit) return 10
  return 5
}

// ---------------------------------------------------------------------------
// Score a single opportunity
// ---------------------------------------------------------------------------

export function scoreOpportunity(opp: RawOpportunity): ScoredOpportunity {
  const demandScore = scoreDemand(opp)
  const recencyScore = scoreRecency(opp)
  const buildabilityScore = scoreBuildability(opp)
  const sourceQualityScore = scoreSourceQuality(opp)
  const marketSignalScore = scoreMarketSignal(opp)

  const score =
    demandScore +
    recencyScore +
    buildabilityScore +
    sourceQualityScore +
    marketSignalScore

  return {
    ...opp,
    score,
    demandScore,
    recencyScore,
    buildabilityScore,
    sourceQualityScore,
    marketSignalScore,
  }
}

// ---------------------------------------------------------------------------
// Score an array of opportunities
// ---------------------------------------------------------------------------

export function scoreOpportunities(opps: RawOpportunity[]): ScoredOpportunity[] {
  return opps
    .map(scoreOpportunity)
    .sort((a, b) => b.score - a.score)
}
