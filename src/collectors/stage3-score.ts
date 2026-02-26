import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { getGroqClient, GROQ_MODEL } from "../lib/groq";
import { calculateProductScores } from "../lib/scoring";
import { Complaint } from "../lib/types";
import { sleep } from "../lib/utils";

const BUILD_THIS_PROMPT = `You are a product strategist. Based on these customer complaints about "{product_name}" ({category}), write a concise "Build This" summary (3-5 sentences) describing what a better competing product would look like.

Focus on: what it would do differently, who it's for, and the key differentiators.

TOP COMPLAINTS:
{complaints}

TOP WISHES:
{wishes}

TOP FEATURE GAPS:
{gaps}

Respond with ONLY the summary text, no formatting or headers.`;

async function generateBuildThisSummary(
  productName: string,
  category: string,
  complaints: Complaint[]
): Promise<string | null> {
  const groq = getGroqClient();

  const topComplaints = complaints
    .filter((c) => c.pain_summary)
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 10)
    .map((c) => `- ${c.pain_summary}`)
    .join("\n");

  const wishes = complaints
    .filter((c) => c.wishes)
    .map((c) => c.wishes!)
    .slice(0, 5)
    .map((w) => `- ${w}`)
    .join("\n");

  const gaps = [
    ...new Set(complaints.flatMap((c) => c.specific_feature_gaps || [])),
  ]
    .slice(0, 10)
    .map((g) => `- ${g}`)
    .join("\n");

  if (!topComplaints) return null;

  const prompt = BUILD_THIS_PROMPT
    .replace("{product_name}", productName)
    .replace("{category}", category || "Software")
    .replace("{complaints}", topComplaints || "N/A")
    .replace("{wishes}", wishes || "N/A")
    .replace("{gaps}", gaps || "N/A");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function updatePainSummaries(
  productId: string,
  complaints: Complaint[]
): Promise<void> {
  const supabase = createServerClient();

  // Group by pain category
  const byCategory = new Map<string, Complaint[]>();
  for (const c of complaints) {
    for (const cat of c.pain_categories || []) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(c);
    }
  }

  for (const [category, catComplaints] of byCategory) {
    const platforms = [...new Set(catComplaints.map((c) => c.source))];
    const avgSev =
      catComplaints.reduce((s, c) => s + (c.severity || 5), 0) / catComplaints.length;
    const quotes = catComplaints
      .filter((c) => c.pain_summary)
      .sort((a, b) => (b.severity || 0) - (a.severity || 0))
      .slice(0, 3)
      .map((c) => c.pain_summary!);
    const wishes = [
      ...new Set(catComplaints.filter((c) => c.wishes).map((c) => c.wishes!)),
    ].slice(0, 3);

    await supabase.from("product_pain_summary").upsert(
      {
        product_id: productId,
        pain_category: category,
        mention_count: catComplaints.length,
        avg_severity: Math.round(avgSev * 10) / 10,
        platforms,
        sample_quotes: quotes,
        common_wishes: wishes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,pain_category" }
    );
  }
}

export async function runStage3() {
  const supabase = createServerClient();

  // Get all products that have complaints
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category");

  if (error || !products) {
    console.error("Failed to fetch products:", error?.message);
    return { scored: 0 };
  }

  console.log(`Stage 3: Scoring ${products.length} products`);

  for (const product of products) {
    // Get all analyzed complaints for this product
    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("product_id", product.id)
      .eq("analyzed", true);

    if (!complaints || complaints.length === 0) continue;

    // Calculate scores
    const scores = calculateProductScores(complaints as Complaint[]);

    // Find latest complaint date
    const dates = complaints
      .filter((c) => c.review_date)
      .map((c) => new Date(c.review_date).getTime());
    const lastComplaintAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    // Generate "Build This" summary for products with enough data
    let buildThisSummary: string | null = null;
    if (complaints.length >= 3) {
      console.log(`  Generating "Build This" for ${product.name}...`);
      buildThisSummary = await generateBuildThisSummary(
        product.name,
        product.category || "",
        complaints as Complaint[]
      );
      await sleep(200);
    }

    // Update product
    await supabase
      .from("products")
      .update({
        pain_score: scores.painScore,
        disruption_score: scores.disruptionScore,
        platform_count: scores.platformCount,
        total_complaints: complaints.length,
        avg_severity:
          Math.round(
            (complaints.reduce((s, c) => s + (c.severity || 5), 0) / complaints.length) * 10
          ) / 10,
        trending_direction: scores.trendingDirection,
        trending_delta: scores.trendingDelta,
        last_complaint_at: lastComplaintAt,
        build_this_summary: buildThisSummary,
      })
      .eq("id", product.id);

    // Update pain summaries
    await updatePainSummaries(product.id, complaints as Complaint[]);

    console.log(
      `  ${product.name}: pain=${scores.painScore} disruption=${scores.disruptionScore} platforms=${scores.platformCount} complaints=${complaints.length}`
    );
  }

  console.log("\nStage 3 scoring complete.");
  return { scored: products.length };
}

// Allow running as standalone script
if (require.main === module) {
  runStage3();
}
