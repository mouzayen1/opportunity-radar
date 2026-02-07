/**
 * Deduplication Strategy for OpportunityRadar v4
 *
 * Three-layer dedup:
 *   1. Exact URL match
 *   2. Tool match (same existingTool -> merge)
 *   3. Title similarity (>50% word overlap -> merge)
 *
 * When merging, we INCREASE the score because multiple independent sources
 * confirming the same pain point is a stronger signal.
 */

import type { ScoredOpportunity } from '@/types'

// ---------------------------------------------------------------------------
// Text normalisation helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip punctuation, split into significant words (3+ chars) */
function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3)
}

/** Word-overlap ratio between two word sets (Jaccard-like using the larger set as denominator) */
function wordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  const overlap = a.filter(w => setB.has(w)).length
  return overlap / Math.max(a.length, b.length)
}

// ---------------------------------------------------------------------------
// Merge two opportunities, keeping the stronger one and combining metadata
// ---------------------------------------------------------------------------

function mergeOpportunities(
  primary: ScoredOpportunity,
  secondary: ScoredOpportunity
): ScoredOpportunity {
  // Keep whichever has the higher score as the base
  const [keep, donor] =
    primary.score >= secondary.score ? [primary, secondary] : [secondary, primary]

  // Combine competitor lists (deduplicated)
  const mergedCompetitors = Array.from(
    new Set([...(keep.competitors ?? []), ...(donor.competitors ?? [])])
  )

  // Combine top complaints if present
  const mergedComplaints = Array.from(
    new Set([...(keep.topComplaints ?? []), ...(donor.topComplaints ?? [])])
  )

  // Increment sourceCount (multiple sources = stronger signal)
  const sourceCount = (keep.sourceCount ?? 1) + (donor.sourceCount ?? 1)

  // Boost score: +3 per additional source, capped at 100
  const boostedScore = Math.min(100, keep.score + 3 * (donor.sourceCount ?? 1))

  // Enrich problem description if the donor adds new info
  let problem = keep.problem
  if (donor.problem && donor.problem !== keep.problem) {
    // Append unique info if it is meaningfully different
    const keepWords = new Set(normalizeWords(keep.problem))
    const donorWords = normalizeWords(donor.problem)
    const newWords = donorWords.filter(w => !keepWords.has(w))
    if (newWords.length > 3) {
      problem = `${keep.problem} Additionally: ${donor.problem}`
    }
  }

  // Prefer whichever willingness_to_pay is more specific
  const wtp = keep.willingness_to_pay || donor.willingness_to_pay

  return {
    ...keep,
    score: boostedScore,
    problem,
    competitors: mergedCompetitors,
    topComplaints: mergedComplaints.length > 0 ? mergedComplaints : undefined,
    sourceCount,
    willingness_to_pay: wtp,
  }
}

// ---------------------------------------------------------------------------
// Main dedup function
// ---------------------------------------------------------------------------

export function deduplicateOpportunities(
  opps: ScoredOpportunity[]
): ScoredOpportunity[] {
  if (opps.length === 0) return []

  // We maintain a list of "canonical" (deduplicated) opportunities.
  // For each incoming opp we check the 3 layers in order.
  const canonical: ScoredOpportunity[] = []

  // Index helpers for fast lookup
  const urlIndex = new Map<string, number>() // url -> index in canonical
  const toolIndex = new Map<string, number>() // lowercase existingTool -> index

  for (const opp of opps) {
    let merged = false

    // -----------------------------------------------------------------------
    // Layer 1: Exact URL match
    // -----------------------------------------------------------------------
    if (opp.url) {
      const existingIdx = urlIndex.get(opp.url)
      if (existingIdx !== undefined) {
        canonical[existingIdx] = mergeOpportunities(canonical[existingIdx], opp)
        merged = true
      }
    }

    // -----------------------------------------------------------------------
    // Layer 2: Tool match (same existingTool)
    // -----------------------------------------------------------------------
    if (!merged && opp.existingTool) {
      const toolKey = opp.existingTool.toLowerCase().trim()
      if (toolKey) {
        const existingIdx = toolIndex.get(toolKey)
        if (existingIdx !== undefined) {
          canonical[existingIdx] = mergeOpportunities(canonical[existingIdx], opp)
          merged = true
        }
      }
    }

    // -----------------------------------------------------------------------
    // Layer 3: Title similarity (>50% word overlap)
    // -----------------------------------------------------------------------
    if (!merged) {
      const oppWords = normalizeWords(opp.title)
      for (let i = 0; i < canonical.length; i++) {
        const cWords = normalizeWords(canonical[i].title)
        if (wordOverlap(oppWords, cWords) > 0.5) {
          canonical[i] = mergeOpportunities(canonical[i], opp)
          merged = true
          break
        }
      }
    }

    // -----------------------------------------------------------------------
    // No match: add as new canonical entry
    // -----------------------------------------------------------------------
    if (!merged) {
      const idx = canonical.length
      canonical.push({ ...opp })

      // Update indexes
      if (opp.url) {
        urlIndex.set(opp.url, idx)
      }
      if (opp.existingTool) {
        const toolKey = opp.existingTool.toLowerCase().trim()
        if (toolKey) {
          toolIndex.set(toolKey, idx)
        }
      }
    }
  }

  // Re-sort by score descending (merges may have boosted some items)
  return canonical.sort((a, b) => b.score - a.score)
}
