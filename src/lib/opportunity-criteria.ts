/**
 * Opportunity Criteria v3.0 - STRICT EVALUATION
 *
 * Step-by-step instructions for AI to evaluate opportunities consistently.
 */

export interface OpportunityScore {
  painClarity: number
  solutionGap: number
  willingnessToPay: number
  buildability: number
  validation: number
  totalScore: number
  isOpportunity: boolean
  reasoning: string
  existingSolutions: string[]
  solutionProblems: string[]
}

export const WEIGHTS = {
  painClarity: 0.15,
  solutionGap: 0.35,       // Increased - most important
  willingnessToPay: 0.25,  // Increased - must want to pay
  buildability: 0.10,
  validation: 0.15,
}

export const MIN_SCORE = 58  // Balanced threshold

/**
 * STRICT AI EVALUATION PROMPT
 *
 * Forces step-by-step evaluation with hard rejections.
 */
export const SCORING_GUIDE = `
## YOUR TASK
You are evaluating if this post represents a REAL business opportunity worth building.
Follow these steps EXACTLY. Do not skip any step.

═══════════════════════════════════════════════════════════════════════════════
STEP 1: HARD REJECTION CHECK (Answer YES/NO to each)
═══════════════════════════════════════════════════════════════════════════════

Check these conditions FIRST. If ANY are YES, give solutionGap=1 and stop.

□ Is this a "why doesn't X exist" curiosity question? (Not actively seeking to buy)
□ Is the person looking for a FREE solution? (Says "free", "open source", "no budget")
□ Is the problem "too many options" or "overwhelmed by choices"? (Solutions exist, they just can't choose)
□ Is this a technical/infrastructure project requiring massive scale? (P2P networks, streaming infrastructure)
□ Is this an advice/career/life question, not a tool request?
□ Is the market obviously saturated? Check these categories:
   - AI writing tools → Jasper, Copy.ai, ChatGPT, Claude, Writesonic (SATURATED)
   - Website analytics → Google Analytics, Plausible, Fathom, PostHog, Mixpanel (SATURATED)
   - Note-taking/PKM → Notion, Obsidian, Roam, Logseq, Craft (SATURATED)
   - Project management → Asana, Monday, Linear, Jira, ClickUp (SATURATED)
   - CRM general → HubSpot, Salesforce, Pipedrive, Close (SATURATED)
   - Email marketing → Mailchimp, ConvertKit, Beehiiv, Substack (SATURATED)

If you checked YES to any above → Set solutionGap=1, total will fail, explain why in reasoning.

═══════════════════════════════════════════════════════════════════════════════
STEP 2: IDENTIFY EXISTING SOLUTIONS
═══════════════════════════════════════════════════════════════════════════════

Before scoring, you MUST list existing solutions. Think carefully:

1. What specific tools/products already solve this problem?
2. Are users in the comments recommending solutions?
3. Did the poster mention trying anything?

List ALL solutions you know of, not just what's mentioned in the post.
If 3+ good solutions exist that are well-known → solutionGap should be 1-4.

═══════════════════════════════════════════════════════════════════════════════
STEP 3: SCORE EACH CRITERION (Only after Steps 1-2)
═══════════════════════════════════════════════════════════════════════════════

### PAIN CLARITY (15% weight)
How specific is the problem? Is there a NUMBER attached?

Score 8-10 ONLY IF:
- Specific time mentioned: "4 hours/week", "every Monday I spend..."
- Specific money mentioned: "$500/month", "costs us..."
- Specific frequency: "47 invoices", "10 times a day"

Score 5-7 IF:
- Clear problem but no numbers: "it's tedious", "takes forever"

Score 1-4 IF:
- Vague: "it's frustrating", "I don't like it"

### SOLUTION GAP (35% weight) - CRITICAL
Are existing solutions ACTUALLY inadequate?

Score 8-10 ONLY IF:
- NO solution exists (rare - verify this is actually true)
- Person TRIED specific solutions and explains WHY they failed
- Niche use case that mainstream tools don't serve

Score 5-7 IF:
- Solutions exist but have documented limitations for THIS use case
- Person explicitly says "I tried X but it doesn't do Y"

Score 1-4 IF:
- Multiple good solutions exist (even if person hasn't tried them)
- Person just hasn't researched options
- "Overwhelmed by options" = solutions EXIST, score LOW
- Market is saturated (see list above)

Score 1-2 IF:
- Perfect solutions exist that are well-reviewed
- Person wants FREE when paid solutions work fine

### WILLINGNESS TO PAY (25% weight)
Would they actually pay money?

Score 8-10 ONLY IF:
- Explicit: "would pay", "budget of $X", "take my money"
- Clear business ROI: "saves X hours = $Y"

Score 5-7 IF:
- Business context (company, professional use)
- Time-is-money implied

Score 1-4 IF:
- Consumer/hobbyist context
- Wants "simple" or "lightweight" (often means free)
- No money signals at all

Score 1-2 IF:
- Explicitly wants FREE: "free tool", "open source", "no budget"
- Student or personal project context

### BUILDABILITY (10% weight)
Can a solo dev build an MVP in 2-3 months?

Score 8-10: Standard web app, clear scope, APIs available
Score 5-7: Some complexity, integrations needed
Score 3-4: Needs partnerships, data acquisition, compliance
Score 1-2: Massive infrastructure, requires team/funding

### VALIDATION (15% weight)
Is this a pattern or one person's edge case?

Score 8-10: 50+ upvotes, many comments agreeing, seen this before
Score 5-7: 10-50 upvotes, some agreement in comments
Score 3-4: Low engagement but problem seems common
Score 1-2: Single person, no engagement, edge case

═══════════════════════════════════════════════════════════════════════════════
STEP 4: CALCULATE AND DECIDE
═══════════════════════════════════════════════════════════════════════════════

Total = (pain × 0.15) + (gap × 0.35) + (pay × 0.25) + (build × 0.10) + (valid × 0.15)
Multiply by 10 for score out of 100.

ACCEPT if score >= 55
REJECT if score < 55

═══════════════════════════════════════════════════════════════════════════════
EXAMPLES OF CORRECT SCORING
═══════════════════════════════════════════════════════════════════════════════

EXAMPLE 1 - ACCEPT:
"Spent my Saturday manually matching 47 invoices to bank payments"
- Pain: 9 (specific number, specific task, time wasted)
- Gap: 8 (tried Xero/QB, they don't auto-match properly)
- Pay: 8 (business owner, clear time savings)
- Build: 8 (bank API + matching logic, feasible)
- Valid: 7 (70 comments, common problem)
→ Total: 81 ✓ ACCEPT

EXAMPLE 2 - REJECT:
"What's the best tool for bulk unsubscribing from newsletters?"
- Pain: 5 (annoying but not quantified)
- Gap: 2 (Unroll.me, Clean Email, Leave Me Alone all exist and work)
- Pay: 3 (consumer convenience, not business critical)
- Build: 7 (feasible)
- Valid: 4 (low engagement)
→ Total: 35 ✗ REJECT - Solutions exist

EXAMPLE 3 - REJECT:
"I am completely overwhelmed by software/CRM options"
- Pain: 6 (real frustration)
- Gap: 2 (problem is TOO MANY options, not lack of solutions)
- Pay: 6 (business context)
- Build: 5 (building another CRM?)
- Valid: 6 (common complaint)
→ Total: 43 ✗ REJECT - "Overwhelmed by options" means solutions exist

EXAMPLE 4 - REJECT:
"Looking for the best free analytics tool"
- Pain: 4 (wants analytics)
- Gap: 2 (GA, Plausible, Fathom, PostHog all exist)
- Pay: 1 (explicitly wants FREE)
- Build: 6 (feasible)
- Valid: 5 (common question)
→ Total: 30 ✗ REJECT - Wants free, saturated market

EXAMPLE 5 - REJECT:
"Why is there no P2P streaming protocol like BitTorrent?"
- Pain: 3 (curiosity, not seeking to buy)
- Gap: 4 (WebRTC exists, technical limitations are real)
- Pay: 1 (no buying intent, avoiding paying for content)
- Build: 1 (massive infrastructure project)
- Valid: 7 (high engagement)
→ Total: 29 ✗ REJECT - Curiosity question, not actionable
`

export function calculateTotalScore(scores: {
  painClarity: number
  solutionGap: number
  willingnessToPay: number
  buildability: number
  validation: number
}): number {
  const weighted =
    (scores.painClarity * WEIGHTS.painClarity) +
    (scores.solutionGap * WEIGHTS.solutionGap) +
    (scores.willingnessToPay * WEIGHTS.willingnessToPay) +
    (scores.buildability * WEIGHTS.buildability) +
    (scores.validation * WEIGHTS.validation)

  return Math.round(weighted * 10)
}

export function isQualifiedOpportunity(totalScore: number): boolean {
  return totalScore >= MIN_SCORE
}
