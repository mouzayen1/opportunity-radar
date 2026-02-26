import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";

const COMPLAINT_SIGNALS = [
  // Strong negatives
  "hate", "terrible", "worst", "awful", "horrible", "nightmare",
  "regret", "waste of money", "scam", "ripoff", "garbage", "trash",
  // Switching signals
  "looking for alternative", "switched from", "moving away from",
  "replacing", "ditching", "leaving", "migrating from",
  "switched to", "moved to", "considering switching",
  // Feature gaps
  "wish it had", "why can't", "missing feature", "still can't",
  "been requesting for years", "roadmap but never", "doesn't support",
  "no way to", "can't even", "wish they would", "should have",
  // Pricing pain
  "price increase", "too expensive", "not worth the price",
  "cheaper alternative", "overpriced", "doubled the price",
  "price hike", "costs too much", "pricing is",
  // Support pain
  "support is useless", "can't get help", "no response",
  "been waiting", "terrible support", "outsourced support",
  // Sentiment signals (broader — catches more real complaints)
  "alternative to", "frustrated", "disappointed", "annoying",
  "problem with", "issue with", "struggle with", "pain",
  "sucks", "broken", "slow", "laggy", "bloated",
  // Reliability
  "buggy", "crashes", "unreliable", "downtime", "keeps crashing",
  // UX
  "clunky", "unintuitive", "confusing", "hard to use", "ugly",
  "complicated", "not intuitive", "poor ux", "bad ui",
];

const NOISE_PATTERNS = [
  /use my (referral|link|code)/i,
  /discount code/i,
  /\b(sponsored|paid partnership)\b/i,
  /\b(hiring|we're looking|job opening|job post|now hiring|open position)\b/i,
  /check out my|i built|i created|just launched|i made|my startup|my saas/i,
  /\b(apply now|resume|cover letter|interview)\b/i,
  /\bshowcase\b.*\b(project|app|tool)\b/i,
  /\b(subscribe|follow me|my channel|my blog|my newsletter)\b/i,
];

export function passesPreFilter(
  text: string,
  options?: { preLinked?: boolean }
): { passes: boolean; signalCount: number } {
  if (text.length < 50) return { passes: false, signalCount: 0 };

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return { passes: false, signalCount: 0 };
  }

  const lowerText = text.toLowerCase();
  let signalCount = 0;
  for (const signal of COMPLAINT_SIGNALS) {
    if (lowerText.includes(signal)) signalCount++;
  }

  // Pre-linked complaints (product already known) only need 1 signal
  // Unlinked complaints need 2+ signals for higher confidence
  const minSignals = options?.preLinked ? 1 : 2;
  return { passes: signalCount >= minSignals, signalCount };
}

// Standalone: log filter stats for unanalyzed complaints
async function main() {
  const supabase = createServerClient();

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, raw_text, title, product_id")
    .eq("analyzed", false);

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    process.exit(1);
  }

  console.log(`Stage 1 Pre-Filter: ${complaints.length} unanalyzed complaints`);

  let passed = 0;
  let failed = 0;

  for (const c of complaints) {
    const text = `${c.title || ""} ${c.raw_text}`;
    const result = passesPreFilter(text, { preLinked: !!c.product_id });
    if (result.passes) passed++;
    else failed++;
  }

  console.log(`  Passed: ${passed} (${((passed / complaints.length) * 100).toFixed(1)}%)`);
  console.log(`  Filtered out: ${failed}`);
}

main();
