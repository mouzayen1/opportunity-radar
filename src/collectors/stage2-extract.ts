import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { getGroqClient, GROQ_MODEL } from "../lib/groq";
import { AIExtraction, PainCategory } from "../lib/types";
import { findOrCreateProduct } from "../lib/normalize";
import { passesPreFilter } from "./stage1-filter";
import {
  getProductConfig,
  validateProductMention,
  postExtractionValidation,
} from "../lib/product-config";
import { sleep } from "../lib/utils";

const MAX_PER_RUN = 200;

// ============================================
// Layer 4A: Entity Verification Prompt (binary yes/no)
// ============================================

const ENTITY_VERIFICATION_PROMPT = `You are a strict entity verification system. Determine if the text below is genuinely about the B2B software product described, NOT about the common English word or any other meaning.

Product: {product_name}
Description: {product_description}
Category: {product_category}

Text:
"""
{text}
"""

Rules:
- Return ONLY "yes" or "no" (nothing else)
- Return "yes" ONLY if the text specifically discusses {product_name} the software/SaaS product
- Return "no" if:
  - The word "{product_name}" is used as a common English word (not the software)
  - The product is mentioned only in passing with no complaint or opinion about it
  - The text is about a completely different topic that happens to contain the word
  - You are not confident this is about the software product
- When in doubt, return "no". False negatives are acceptable. False positives are not.

Answer:`;

// ============================================
// Layer 4B: Pain Extraction Prompt (for verified items only)
// ============================================

const EXTRACTION_PROMPT = `You are a B2B software complaint analyst. This complaint has been verified to be about {product_name} ({product_description}).

Extract the pain details from this text. ONLY extract information that is EXPLICITLY stated. Do not infer, guess, or hallucinate details.

TEXT:
{text}

SOURCE: {source} ({url})

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "pain_categories": ["array of categories from: pricing, ux, support, reliability, features, onboarding, mobile, contracts, integrations, scaling"],
  "pain_summary": "one sentence summary of the core complaint, or null if no clear complaint",
  "severity": 5,
  "wishes": "what the user wishes existed instead (or null if not stated)",
  "specific_feature_gaps": ["specific missing features explicitly mentioned"],
  "competitor_mentions": ["other products mentioned as alternatives"],
  "estimated_monthly_spend": "estimated monthly cost range like '$50-100' or null",
  "user_segment": "small_business | mid_market | enterprise | freelancer | null",
  "switching_intent": "none | considering | actively_looking | already_switched",
  "is_valid_complaint": true
}`;

// Fallback prompt for unlinked complaints (no pre-linked product)
const UNLINKED_EXTRACTION_PROMPT = `You are a B2B software complaint analyst. Analyze this review/complaint and extract structured data.

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
  "user_segment": "small_business | mid_market | enterprise | freelancer | null",
  "switching_intent": "none | considering | actively_looking | already_switched",
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

// ============================================
// Layer 4A: Entity verification (binary, cheap)
// ============================================

async function verifyEntity(
  text: string,
  productName: string,
  productDescription: string,
  productCategory: string
): Promise<boolean> {
  const groq = getGroqClient();

  const prompt = ENTITY_VERIFICATION_PROMPT
    .replace(/{product_name}/g, productName)
    .replace("{product_description}", productDescription)
    .replace("{product_category}", productCategory)
    .replace("{text}", text.substring(0, 1500));

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 5,
    });

    const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
    return answer === "yes";
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 429) {
      throw error;
    }
    console.error("  Entity verification error:", error);
    return false; // When in doubt, reject
  }
}

// ============================================
// Layer 4B: Pain extraction (for verified items)
// ============================================

async function extractPain(
  text: string,
  source: string,
  url: string,
  productName: string,
  productDescription: string
): Promise<AIExtraction | null> {
  const groq = getGroqClient();

  const prompt = EXTRACTION_PROMPT
    .replace(/{product_name}/g, productName)
    .replace("{product_description}", productDescription)
    .replace("{text}", text.substring(0, 2000))
    .replace("{source}", source)
    .replace("{url}", url || "");

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
    return parseExtraction(content, productName);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 429) {
      throw error;
    }
    console.error("  Extraction error:", error);
    return null;
  }
}

// Fallback: extract from unlinked complaint (no known product)
async function extractUnlinked(
  text: string,
  source: string,
  url: string
): Promise<AIExtraction | null> {
  const groq = getGroqClient();

  const prompt = UNLINKED_EXTRACTION_PROMPT
    .replace("{text}", text.substring(0, 2000))
    .replace("{source}", source)
    .replace("{url}", url || "");

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
    return parseExtraction(content);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 429) {
      throw error;
    }
    console.error("  Extraction error:", error);
    return null;
  }
}

export async function runStage2(options?: { maxItems?: number }) {
  const limit = options?.maxItems || MAX_PER_RUN;
  const supabase = createServerClient();

  // Fetch unanalyzed complaints
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("analyzed", false)
    .order("collected_at", { ascending: true })
    .limit(limit * 3);

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    return { analyzed: 0, linked: 0, quotaHit: false };
  }

  console.log(`Stage 2: ${complaints.length} unanalyzed complaints`);

  // Apply Stage 1 filter
  const filtered = complaints.filter((c) => {
    const text = `${c.title || ""} ${c.raw_text}`;
    return passesPreFilter(text, { preLinked: !!c.product_id }).passes;
  });

  console.log(`  Passed pre-filter: ${filtered.length}`);
  const toAnalyze = filtered.slice(0, limit);
  const preLinkedCount = toAnalyze.filter((c) => c.product_id).length;
  console.log(`  Analyzing: ${toAnalyze.length} (${preLinkedCount} pre-linked)`);

  // Mark filtered-out complaints as analyzed
  const filteredOutIds = complaints
    .filter((c) => !filtered.includes(c))
    .map((c) => c.id);

  if (filteredOutIds.length > 0) {
    await supabase
      .from("complaints")
      .update({ analyzed: true, product_id: null })
      .in("id", filteredOutIds);
    console.log(`  Marked ${filteredOutIds.length} filtered-out as analyzed`);
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
  let entityRejected = 0;
  let sanityRejected = 0;

  for (const complaint of toAnalyze) {
    const text = `${complaint.title || ""}\n${complaint.raw_text}`;
    const isPreLinked = !!complaint.product_id;
    const preLinkedProductName = isPreLinked
      ? productNameCache.get(complaint.product_id) || undefined
      : undefined;

    try {
      if (isPreLinked && preLinkedProductName) {
        // ---- PRE-LINKED PATH: verify + extract ----

        // Get product config for Layer 3 + 4A
        const config = getProductConfig(preLinkedProductName);
        const productDescription = config?.description || "";
        const productCategory = config?.category || "";

        // Layer 3: Rule-based validation (already done at collection, but double-check)
        if (config) {
          const validation = validateProductMention(text, config);
          if (!validation.valid) {
            // Clear product link and mark analyzed
            await supabase
              .from("complaints")
              .update({ analyzed: true, product_id: null })
              .eq("id", complaint.id);
            analyzed++;
            entityRejected++;
            continue;
          }
        }

        // Layer 4A: Entity verification (AI binary check)
        if (config && config.ambiguity_tier !== "safe") {
          const isAboutProduct = await verifyEntity(
            text,
            preLinkedProductName,
            productDescription,
            productCategory
          );
          await sleep(1000);

          if (!isAboutProduct) {
            await supabase
              .from("complaints")
              .update({ analyzed: true, product_id: null })
              .eq("id", complaint.id);
            analyzed++;
            entityRejected++;
            console.log(`  [${analyzed}] ${preLinkedProductName} — entity rejected`);
            continue;
          }
        }

        // Layer 4B: Pain extraction
        const extraction = await extractPain(
          text,
          complaint.source,
          complaint.source_url,
          preLinkedProductName,
          config?.description || ""
        );
        analyzed++;
        await sleep(1000);

        if (!extraction) {
          await supabase
            .from("complaints")
            .update({ analyzed: true })
            .eq("id", complaint.id);
          continue;
        }

        // Layer 5: Post-extraction sanity check
        const sanity = postExtractionValidation(extraction);
        if (!sanity.valid) {
          await supabase
            .from("complaints")
            .update({ analyzed: true, product_id: null })
            .eq("id", complaint.id);
          sanityRejected++;
          continue;
        }

        // Save extraction results
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
          `  [${analyzed}] ${preLinkedProductName} — ${extraction.pain_summary?.substring(0, 60)}`
        );
      } else {
        // ---- UNLINKED PATH: full AI extraction ----
        const extraction = await extractUnlinked(
          text,
          complaint.source,
          complaint.source_url
        );
        analyzed++;
        await sleep(1000);

        if (!extraction || !extraction.product_name) {
          await supabase
            .from("complaints")
            .update({ analyzed: true })
            .eq("id", complaint.id);
          continue;
        }

        // Layer 5: Post-extraction sanity check
        const sanity = postExtractionValidation(extraction);
        if (!sanity.valid) {
          await supabase
            .from("complaints")
            .update({ analyzed: true })
            .eq("id", complaint.id);
          sanityRejected++;
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
          `  [${analyzed}] ${extraction.product_name} — ${extraction.pain_summary?.substring(0, 60)}`
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
  }

  console.log(`\nStage 2 complete: ${analyzed} analyzed, ${linked} linked`);
  console.log(`  Entity rejected: ${entityRejected}, Sanity rejected: ${sanityRejected}`);
  if (quotaHit) console.log("  (stopped early due to rate limit)");
  return { analyzed, linked, quotaHit };
}

// Allow running as standalone script
if (require.main === module) {
  runStage2();
}
