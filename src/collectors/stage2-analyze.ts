import { FilteredItem, Opportunity, OpportunityAnalysis } from '../lib/types';
import { analyzeOpportunity, sleep } from '../lib/groq';
import { calculateAllScores } from '../lib/scoring';

const DELAY_BETWEEN_CALLS_MS = 200;

interface AnalysisResult {
  opportunities: Opportunity[];
  analyzed_count: number;
  quota_hit: boolean;
}

/**
 * Analyze filtered items with Groq, handling rate limits gracefully
 * Returns partial results if quota is hit
 */
export async function analyzeItems(items: FilteredItem[]): Promise<AnalysisResult> {
  const opportunities: Opportunity[] = [];
  let quotaHit = false;

  console.log(`Starting Stage 2 analysis of ${items.length} items...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      console.log(`[${i + 1}/${items.length}] Analyzing: ${item.title.slice(0, 50)}...`);

      const analysis = await analyzeOpportunity(item);

      if (analysis) {
        const opportunity = buildOpportunity(item, analysis);
        opportunities.push(opportunity);
        console.log(`  -> ${opportunity.opportunity_type} | Score: ${opportunity.overall_score}`);
      } else {
        console.log(`  -> Analysis returned null, skipping`);
      }

      // Small delay between calls to be nice to the API
      if (i < items.length - 1) {
        await sleep(DELAY_BETWEEN_CALLS_MS);
      }
    } catch (error: unknown) {
      // Check for rate limit error
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        console.log(`Groq quota hit after ${opportunities.length} items. Saving partial results.`);
        quotaHit = true;
        break;
      }

      // Other errors - log and continue
      console.error(`Analysis failed for ${item.source_id}:`, error);
    }
  }

  console.log(`Stage 2 complete: ${opportunities.length} opportunities analyzed`);

  return {
    opportunities,
    analyzed_count: opportunities.length,
    quota_hit: quotaHit,
  };
}

/**
 * Build a full Opportunity record from FilteredItem and Analysis
 */
function buildOpportunity(item: FilteredItem, analysis: OpportunityAnalysis): Opportunity {
  const baseOpportunity: Partial<Opportunity> = {
    source: item.source,
    source_id: item.source_id,
    source_url: item.source_url,
    opportunity_type: item.opportunity_type,
    title: item.title,
    raw_text: item.raw_text,
    upvotes: item.upvotes,
    comments_count: item.comments_count,
    posted_at: item.posted_at,
    analyzed_at: new Date(),

    // Analysis results
    summary: analysis.summary,
    target_market: analysis.target_market,
    complexity: analysis.complexity,
    pain_score: analysis.pain_score,
    market_score: analysis.market_score,
    feasibility_score: analysis.feasibility_score,
    urgency_score: analysis.urgency_score,
  };

  // Type-specific fields
  if (item.opportunity_type === 'GREENFIELD') {
    baseOpportunity.problem_description = analysis.problem_description;
  } else {
    baseOpportunity.existing_solution = analysis.existing_solution;
    baseOpportunity.complaint_type = analysis.complaint_type;
  }

  // Calculate scores
  const scores = calculateAllScores(baseOpportunity);

  return {
    ...baseOpportunity,
    recency_score: scores.recency_score,
    replacement_score: scores.replacement_score,
    overall_score: scores.overall_score,
  } as Opportunity;
}

/**
 * Select top items for analysis based on percentage
 * Default: top 20% of items go to Stage 2
 */
export function selectForAnalysis(items: FilteredItem[], percentage: number = 0.2): FilteredItem[] {
  const count = Math.max(1, Math.ceil(items.length * percentage));
  return items.slice(0, count);
}
