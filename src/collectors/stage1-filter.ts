import { RawItem, FilteredItem, OpportunityType } from '../lib/types';

// Patterns indicating GREENFIELD opportunities (new problems, no solution exists)
const GREENFIELD_PATTERNS = [
  // Direct requests
  /\bi(?:'m| am) looking for\b/i,
  /\bdoes anyone know\b/i,
  /\bis there (?:a|any)\b/i,
  /\bany(?:one|body) know\b/i,
  /\blooking for (?:a |an |something)\b/i,
  /\bneed (?:a |an |something|help)\b/i,
  /\bwant(?:ed|ing)? (?:a |an |to find)\b/i,
  /\bwish (?:there was|I had|I could)\b/i,

  // Problem statements
  /\bno (?:good |decent )?(?:tool|app|solution|way)\b/i,
  /\bdoesn'?t exist\b/i,
  /\bnothing (?:that |which )?(?:does|works|can)\b/i,
  /\bcan'?t find (?:a |any)\b/i,
  /\bstruggling to find\b/i,
  /\bhas anyone built\b/i,
  /\bwhy (?:isn'?t there|doesn'?t)\b/i,
  /\bwould (?:love|pay|kill) (?:for|to have)\b/i,

  // Opportunity signals
  /\bmillion dollar idea\b/i,
  /\bstartup idea\b/i,
  /\bgap in (?:the )?market\b/i,
  /\bunmet need\b/i,
  /\bproblem worth solving\b/i,
];

// Patterns indicating MAKE_IT_BETTER opportunities (existing solution sucks)
const MAKE_IT_BETTER_PATTERNS = [
  // Direct complaints
  /\balternative(?:s)? to\b/i,
  /\breplace(?:ment|d|ing)? (?:for )?\b/i,
  /\bswitch(?:ed|ing)? (?:from|away)\b/i,
  /\bleaving\b/i,
  /\bmigrat(?:e|ed|ing)\b/i,

  // Negative sentiment
  /\bhate(?:s|d)?\b/i,
  /\bfrustrat(?:ed|ing)\b/i,
  /\bdisappoint(?:ed|ing)\b/i,
  /\bterrible\b/i,
  /\bawful\b/i,
  /\bhorrrible\b/i,
  /\bworst\b/i,
  /\bsucks?\b/i,
  /\bgarbage\b/i,
  /\btrash\b/i,

  // Specific complaints
  /\btoo expensive\b/i,
  /\boverpriced\b/i,
  /\bprice(?:d|s|ing)?\b.*\b(?:crazy|insane|ridiculous)\b/i,
  /\b(?:crazy|insane|ridiculous)\b.*\bprice\b/i,
  /\btoo (?:slow|complex|complicated|bloated)\b/i,
  /\bmissing (?:feature|functionality)\b/i,
  /\bno (?:longer |more )?support\b/i,
  /\bbroken\b/i,
  /\bbuggy\b/i,
  /\bunreliable\b/i,
  /\bdown(?:time)?\b/i,

  // Comparison requests
  /\bbetter than\b/i,
  /\bvs\.?\b/i,
  /\bcompare(?:d|s|ing)?\b/i,
  /\bopen[- ]?source alternative\b/i,
  /\bself[- ]?host(?:ed|ing)?\b/i,
];

interface Stage1Result {
  passed: boolean;
  opportunity_type?: OpportunityType;
  matched_patterns: string[];
  rejection_reason?: string;
}

/**
 * Stage 1 filter checks:
 * 1. Pattern match (returns which type)
 * 2. Recency (< 90 days)
 * 3. Engagement (>= 2 upvotes or comments)
 * 4. Length (>= 50 chars)
 */
export function passesStage1Filter(item: RawItem): Stage1Result {
  // Check length
  if (item.raw_text.length < 50 && item.title.length < 20) {
    return {
      passed: false,
      matched_patterns: [],
      rejection_reason: 'Content too short',
    };
  }

  // Check recency (< 90 days)
  const ageInDays = (Date.now() - item.posted_at.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 90) {
    return {
      passed: false,
      matched_patterns: [],
      rejection_reason: 'Too old (> 90 days)',
    };
  }

  // Check engagement (>= 2)
  const engagement = item.upvotes + item.comments_count;
  if (engagement < 2) {
    return {
      passed: false,
      matched_patterns: [],
      rejection_reason: 'Low engagement (< 2)',
    };
  }

  // Check patterns
  const content = `${item.title} ${item.raw_text}`;

  // Check MAKE_IT_BETTER first (more specific)
  const makeItBetterMatches: string[] = [];
  for (const pattern of MAKE_IT_BETTER_PATTERNS) {
    if (pattern.test(content)) {
      makeItBetterMatches.push(pattern.source);
    }
  }

  if (makeItBetterMatches.length > 0) {
    return {
      passed: true,
      opportunity_type: 'MAKE_IT_BETTER',
      matched_patterns: makeItBetterMatches,
    };
  }

  // Check GREENFIELD
  const greenfieldMatches: string[] = [];
  for (const pattern of GREENFIELD_PATTERNS) {
    if (pattern.test(content)) {
      greenfieldMatches.push(pattern.source);
    }
  }

  if (greenfieldMatches.length > 0) {
    return {
      passed: true,
      opportunity_type: 'GREENFIELD',
      matched_patterns: greenfieldMatches,
    };
  }

  return {
    passed: false,
    matched_patterns: [],
    rejection_reason: 'No matching patterns',
  };
}

/**
 * Filter a batch of raw items through Stage 1
 */
export function filterItems(items: RawItem[]): FilteredItem[] {
  const filtered: FilteredItem[] = [];

  for (const item of items) {
    const result = passesStage1Filter(item);
    if (result.passed && result.opportunity_type) {
      filtered.push({
        ...item,
        opportunity_type: result.opportunity_type,
        matched_patterns: result.matched_patterns,
      });
    }
  }

  return filtered;
}

/**
 * Sort filtered items by engagement and recency for Stage 2 prioritization
 */
export function prioritizeForAnalysis(items: FilteredItem[]): FilteredItem[] {
  return [...items].sort((a, b) => {
    // Primary: engagement (higher is better)
    const engagementA = a.upvotes + a.comments_count;
    const engagementB = b.upvotes + b.comments_count;

    if (engagementB !== engagementA) {
      return engagementB - engagementA;
    }

    // Secondary: recency (newer is better)
    return b.posted_at.getTime() - a.posted_at.getTime();
  });
}
