import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";

const COMPLAINT_SIGNALS = [
  "hate", "terrible", "worst", "awful", "horrible", "nightmare",
  "regret", "waste of money", "scam", "ripoff", "garbage",
  "looking for alternative", "switched from", "moving away from",
  "replacing", "ditching", "leaving", "migrating from",
  "wish it had", "why can't", "missing feature", "still can't",
  "been requesting for years", "roadmap but never",
  "price increase", "too expensive", "not worth the price",
  "cheaper alternative", "overpriced", "doubled the price",
  "support is useless", "can't get help", "no response",
  "been waiting", "terrible support", "outsourced support",
  "alternative to", "frustrated with", "disappointed",
  "buggy", "crashes", "unreliable", "downtime",
  "clunky", "unintuitive", "confusing", "hard to use",
];

const NOISE_PATTERNS = [
  /use my (referral|link|code)/i,
  /discount code/i,
  /\b(sponsored|paid partnership)\b/i,
  /\b(hiring|we're looking|job opening)\b/i,
  /check out my|i built|i created|just launched/i,
];

export function passesPreFilter(text: string): { passes: boolean; signalCount: number } {
  if (text.length < 50) return { passes: false, signalCount: 0 };

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return { passes: false, signalCount: 0 };
  }

  const lowerText = text.toLowerCase();
  let signalCount = 0;
  for (const signal of COMPLAINT_SIGNALS) {
    if (lowerText.includes(signal)) signalCount++;
  }

  return { passes: signalCount >= 1, signalCount };
}

// Standalone: log filter stats for unanalyzed complaints
async function main() {
  const supabase = createServerClient();

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, raw_text, title")
    .eq("analyzed", false)
    .is("product_id", null);

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    process.exit(1);
  }

  console.log(`Stage 1 Pre-Filter: ${complaints.length} unanalyzed complaints`);

  let passed = 0;
  let failed = 0;

  for (const c of complaints) {
    const text = `${c.title || ""} ${c.raw_text}`;
    const result = passesPreFilter(text);
    if (result.passes) passed++;
    else failed++;
  }

  console.log(`  Passed: ${passed} (${((passed / complaints.length) * 100).toFixed(1)}%)`);
  console.log(`  Filtered out: ${failed}`);
}

main();
