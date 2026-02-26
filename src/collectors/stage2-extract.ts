import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { getGroqClient, GROQ_MODEL } from "../lib/groq";
import { AIExtraction, PainCategory } from "../lib/types";
import { findOrCreateProduct } from "../lib/normalize";
import { passesPreFilter } from "./stage1-filter";
import { sleep } from "../lib/utils";

const MAX_PER_RUN = 200;

const EXTRACTION_PROMPT = `You are a B2B software complaint analyst. Analyze this review/complaint and extract structured data.

REVIEW TEXT:
{text}

SOURCE: {source} ({url})

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "product_name": "exact product name being complained about (or null if unclear)",
  "product_category": "software category (e.g., 'Field Service Management', 'CRM', 'Accounting')",
  "pain_categories": ["array of categories from: pricing, ux, support, reliability, features, onboarding, mobile, contracts, integrations, scaling"],
  "pain_summary": "one sentence summary of the core complaint",
  "severity": 7,
  "wishes": "what the user wishes existed instead (or null)",
  "specific_feature_gaps": ["array of specific missing features or improvements needed"],
  "competitor_mentions": ["other products mentioned positively or as alternatives"],
  "estimated_monthly_spend": "estimated monthly cost range like '$50-100' or null if unknown",
  "user_segment": "who is complaining: 'small_business', 'mid_market', 'enterprise', 'freelancer', or null",
  "switching_intent": "none|considering|actively_looking|already_switched",
  "is_valid_complaint": true
}`;

const PRELINKED_EXTRACTION_PROMPT = `You are a B2B software complaint analyst. This complaint is about {product_name}. Extract the pain details from this review/complaint.

REVIEW TEXT:
{text}

SOURCE: {source} ({url})
KNOWN PRODUCT: {product_name}

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "pain_categories": ["array of categories from: pricing, ux, support, reliability, features, onboarding, mobile, contracts, integrations, scaling"],
  "pain_summary": "one sentence summary of the core complaint",
  "severity": 7,
  "wishes": "what the user wishes existed instead (or null)",
  "specific_feature_gaps": ["array of specific missing features or improvements needed"],
  "competitor_mentions": ["other products mentioned positively or as alternatives"],
  "estimated_monthly_spend": "estimated monthly cost range like '$50-100' or null if unknown",
  "user_segment": "who is complaining: 'small_business', 'mid_market', 'enterprise', 'freelancer', or null",
  "switching_intent": "none|considering|actively_looking|already_switched",
  "is_valid_complaint": true
}`;

const VALID_PAIN_CATEGORIES: PainCategory[] = [
  "pricing", "ux", "support", "reliability", "features",
  "onboarding", "mobile", "contracts", "integrations", "scaling",
];

function parseExtraction(raw: string, preLinkedProductName?: string): AIExtraction | null {
  try {
    let json = raw.trim();
    if (json.startsWith("```")) {
      json = json.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }
    const parsed = JSON.parse(json);

    if (!parsed.is_valid_complaint) return null;

    // Validate pain categories
    const validCategories = (parsed.pain_categories || []).filter(
      (c: string) => VALID_PAIN_CATEGORIES.includes(c as PainCategory)
    );

    return {
      product_name: preLinkedProductName || parsed.product_name || null,
      product_category: parsed.product_category || null,
      pain_categories: validCategories,
      pain_summary: parsed.pain_summary || "",
      severity: Math.max(1, Math.min(10, Math.round(parsed.severity || 5))),
      wishes: parsed.wishes || null,
      specific_feature_gaps: parsed.specific_feature_gaps || [],
      competitor_mentions: parsed.competitor_mentions || [],
      estimated_monthly_spend: parsed.estimated_monthly_spend || null,
      user_segment: parsed.user_segment || null,
      switching_intent: parsed.switching_intent || "none",
      is_valid_complaint: true,
    };
  } catch {
    return null;
  }
}

async function analyzeComplaint(
  text: string,
  source: string,
  url: string,
  preLinkedProductName?: string
): Promise<AIExtraction | null> {
  const groq = getGroqClient();

  let prompt: string;
  if (preLinkedProductName) {
    prompt = PRELINKED_EXTRACTION_PROMPT
      .replace(/{product_name}/g, preLinkedProductName)
      .replace("{text}", text.substring(0, 2000))
      .replace("{source}", source)
      .replace("{url}", url || "");
  } else {
    prompt = EXTRACTION_PROMPT
      .replace("{text}", text.substring(0, 2000))
      .replace("{source}", source)
      .replace("{url}", url || "");
  }

  // Retry with short backoff on rate limits
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;
      return parseExtraction(content, preLinkedProductName);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 429) {
        if (attempt < 2) {
          const waitMs = (attempt + 1) * 2000; // 2s, 4s
          console.log(`  Rate limited, waiting ${waitMs / 1000}s (attempt ${attempt + 1}/3)...`);
          await sleep(waitMs);
          continue;
        }
        throw error; // Give up after 3 attempts
      }
      console.error("  Groq API error:", error);
      return null;
    }
  }
  return null;
}

export async function runStage2(options?: { maxItems?: number }) {
  const limit = options?.maxItems || MAX_PER_RUN;
  const supabase = createServerClient();

  // Fetch ALL unanalyzed complaints (both pre-linked and unlinked)
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("analyzed", false)
    .order("collected_at", { ascending: true })
    .limit(limit * 3); // Fetch extra since many will be filtered

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    return { analyzed: 0, linked: 0 };
  }

  console.log(`Stage 2: ${complaints.length} unanalyzed complaints`);

  // Apply Stage 1 filter (pre-linked complaints get a lighter filter)
  const filtered = complaints.filter((c) => {
    const text = `${c.title || ""} ${c.raw_text}`;
    return passesPreFilter(text, { preLinked: !!c.product_id }).passes;
  });

  console.log(`  Passed pre-filter: ${filtered.length}`);
  const toAnalyze = filtered.slice(0, limit);
  const preLinkedCount = toAnalyze.filter((c) => c.product_id).length;
  console.log(`  Analyzing: ${toAnalyze.length} (${preLinkedCount} pre-linked)`);

  // Mark filtered-out complaints as analyzed (no product) so we don't reprocess
  const filteredOutIds = complaints
    .filter((c) => !filtered.includes(c))
    .map((c) => c.id);

  if (filteredOutIds.length > 0) {
    // Clear product_id on filtered-out complaints so they don't inflate product counts
    await supabase
      .from("complaints")
      .update({ analyzed: true, product_id: null })
      .in("id", filteredOutIds);
    console.log(`  Marked ${filteredOutIds.length} filtered-out as analyzed (cleared product_id)`);
  }

  // Cache product names for pre-linked complaints
  const productNameCache = new Map<string, string>();
  const productIdsToFetch = [
    ...new Set(toAnalyze.filter((c) => c.product_id).map((c) => c.product_id)),
  ];
  if (productIdsToFetch.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIdsToFetch);
    for (const p of products || []) {
      productNameCache.set(p.id, p.name);
    }
  }

  let analyzed = 0;
  let linked = 0;
  let quotaHit = false;

  for (const complaint of toAnalyze) {
    const text = `${complaint.title || ""}\n${complaint.raw_text}`;
    const isPreLinked = !!complaint.product_id;
    const preLinkedProductName = isPreLinked
      ? productNameCache.get(complaint.product_id) || undefined
      : undefined;

    try {
      const extraction = await analyzeComplaint(
        text,
        complaint.source,
        complaint.source_url,
        preLinkedProductName
      );

      analyzed++;

      if (!extraction) {
        // Not a valid complaint — mark as analyzed
        await supabase
          .from("complaints")
          .update({ analyzed: true })
          .eq("id", complaint.id);
        continue;
      }

      if (isPreLinked) {
        // Already linked to product — just update pain details
        await supabase
          .from("complaints")
          .update({
            pain_categories: extraction.pain_categories,
            pain_summary: extraction.pain_summary,
            severity: extraction.severity,
            wishes: extraction.wishes,
            specific_feature_gaps: extraction.specific_feature_gaps,
            competitor_mentions: extraction.competitor_mentions,
            switching_intent: extraction.switching_intent,
            user_segment: extraction.user_segment,
            analyzed: true,
          })
          .eq("id", complaint.id);

        linked++;
        console.log(
          `  [${analyzed}/${toAnalyze.length}] ${preLinkedProductName} (pre-linked) — ${extraction.pain_summary?.substring(0, 60)}`
        );
      } else {
        // Not pre-linked — need to resolve product from AI extraction
        if (!extraction.product_name) {
          await supabase
            .from("complaints")
            .update({ analyzed: true })
            .eq("id", complaint.id);
          continue;
        }

        const product = await findOrCreateProduct(
          extraction.product_name,
          extraction.product_category || undefined
        );

        await supabase
          .from("complaints")
          .update({
            product_id: product.id,
            pain_categories: extraction.pain_categories,
            pain_summary: extraction.pain_summary,
            severity: extraction.severity,
            wishes: extraction.wishes,
            specific_feature_gaps: extraction.specific_feature_gaps,
            competitor_mentions: extraction.competitor_mentions,
            switching_intent: extraction.switching_intent,
            user_segment: extraction.user_segment,
            analyzed: true,
          })
          .eq("id", complaint.id);

        linked++;
        console.log(
          `  [${analyzed}/${toAnalyze.length}] ${extraction.product_name} — ${extraction.pain_summary?.substring(0, 60)}`
        );
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 429) {
        console.log("  Groq rate limit hit, stopping.");
        quotaHit = true;
        break;
      }
      console.error(`  Error analyzing complaint ${complaint.id}:`, error);
      await supabase
        .from("complaints")
        .update({ analyzed: true })
        .eq("id", complaint.id);
    }

    await sleep(1000); // 1s between calls to respect Groq free tier limits
  }

  console.log(`\nStage 2 complete: ${analyzed} analyzed, ${linked} linked to products`);
  if (quotaHit) console.log("  (stopped early due to rate limit)");
  return { analyzed, linked, quotaHit };
}

// Allow running as standalone script
if (require.main === module) {
  runStage2();
}
