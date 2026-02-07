/**
 * Deep Analysis for OpportunityRadar v4
 *
 * Sends the top 30 scored opportunities to AI for a final
 * curated analysis, returning the top 8 most promising as DeepAnalysis[].
 *
 * Uses the same pi-ai provider rotation as the rest of the pipeline.
 */

import { getModel, complete, Context, getEnvApiKey } from '@mariozechner/pi-ai'
import type { ScoredOpportunity, DeepAnalysis, LogEntry } from '@/types'

// ---------------------------------------------------------------------------
// Provider rotation (mirrors pipeline/route.ts)
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', envKey: 'groq' },
  { provider: 'google', model: 'gemini-2.0-flash', envKey: 'google' },
] as const

type ProviderConfig = typeof PROVIDERS[number]

function getAvailableProviders(): ProviderConfig[] {
  return PROVIDERS.filter(p => {
    const key = getEnvApiKey(p.envKey)
    return key !== undefined
  })
}

// ---------------------------------------------------------------------------
// Helper: create a LogEntry
// ---------------------------------------------------------------------------

function log(
  level: LogEntry['level'],
  source: string,
  message: string
): LogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source,
    message,
  }
}

// ---------------------------------------------------------------------------
// Build the deep-analysis prompt
// ---------------------------------------------------------------------------

function buildDeepAnalysisPrompt(opps: ScoredOpportunity[]): string {
  const oppSummaries = opps
    .map(
      (o, i) =>
        `${i + 1}. [Score ${o.score}] "${o.title}" - ${o.problem} | Type: ${o.type} | Engagement: ${o.engagement} | Competitors: ${(o.competitors ?? []).join(', ') || 'none listed'} | Industry: ${o.industry || 'general'} | Target: ${o.targetUser || 'unknown'} | WTP: ${o.willingness_to_pay || 'not stated'} | Sources: ${o.sourceCount ?? 1}`
    )
    .join('\n')

  return `You are a senior venture analyst and indie hacker mentor. Below are ${opps.length} software opportunities ranked by a scoring algorithm. Your job is to pick the TOP 8 most promising and provide actionable deep analysis.

OPPORTUNITIES:
${oppSummaries}

RESPOND WITH ONLY A VALID JSON ARRAY of exactly 8 objects. First character must be [, last must be ].

Each object must have these exact fields:
{
  "rank": 1-8,
  "title": "concise opportunity title",
  "type": "greenfield" or "makeItBetter",
  "problem": "1-2 sentence problem statement with specifics",
  "solution": "concrete MVP you can build in week 1 - be specific about features",
  "viability": 1-100 score,
  "market": "small (<$10M TAM)", "medium ($10M-$100M TAM)", or "large ($100M+ TAM)" with brief TAM reasoning,
  "difficulty": "weekend", "week", or "month",
  "monthlyRevenue": "realistic MRR estimate at 100 customers (e.g. '$2,000/mo at $20/user')",
  "competitors": ["real", "competitor", "names"],
  "competitorWeakness": "specific weakness of the main competitor you'd exploit",
  "moat": "what makes this defensible (network effects, data, integrations, niche expertise)",
  "pricing": "specific pricing strategy (e.g. 'freemium, $15/mo pro, $49/mo team')",
  "firstCustomers": "where to find your first 10 paying customers (be specific: subreddits, communities, job titles)",
  "validationStep": "the single cheapest way to validate demand BEFORE building (e.g. 'post in r/X asking if people would pay for Y')",
  "redFlag": "the biggest risk or reason this could fail",
  "evidence": number of independent sources/signals for this opportunity
}

RULES:
1. Pick opportunities with the BEST combination of demand, buildability, and monetization potential.
2. Prefer opportunities with multiple independent source signals (sourceCount > 1).
3. Be realistic about revenue estimates - no fantasy numbers.
4. Every competitor name must be a REAL product.
5. "solution" should describe a concrete MVP, not a vague concept.
6. Do NOT pick 2 opportunities that are essentially the same idea.
7. Respond with ONLY the JSON array. No markdown, no backticks, no explanations.`
}

// ---------------------------------------------------------------------------
// Run deep analysis
// ---------------------------------------------------------------------------

export async function runDeepAnalysis(
  topOpps: ScoredOpportunity[]
): Promise<{ insights: DeepAnalysis[]; logs: LogEntry[] }> {
  const logs: LogEntry[] = []

  const providers = getAvailableProviders()
  if (providers.length === 0) {
    logs.push(log('error', 'Deep Analysis', 'No AI providers available. Set GROQ_API_KEY or GEMINI_API_KEY.'))
    return { insights: [], logs }
  }

  // Take the top 30 (or fewer if we don't have that many)
  const candidates = topOpps.slice(0, 30)
  logs.push(log('info', 'Deep Analysis', `Sending top ${candidates.length} opportunities for final analysis`))

  const prompt = buildDeepAnalysisPrompt(candidates)

  // Try each provider until one succeeds (deep analysis is critical)
  for (let attempt = 0; attempt < providers.length; attempt++) {
    const provider = providers[attempt % providers.length]
    logs.push(log('info', 'Deep Analysis', `Attempt ${attempt + 1}/${providers.length} via ${provider.provider}`))

    const startTime = Date.now()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = getModel(provider.provider as any, provider.model as any)
      const systemInstructions = 'You are a JSON API endpoint. Respond with ONLY a valid JSON array. First character must be [, last must be ]. NEVER include markdown, backticks, or explanatory text.'
      const context: Context = {
        messages: [
          { role: 'user', content: `${systemInstructions}\n\n---\n\n${prompt}`, timestamp: Date.now() },
        ],
      }

      const response = await complete(model, context, {
        temperature: 0.3,
        maxTokens: 6000,
      })

      // Extract text
      let text = ''
      for (const content of response.content) {
        if (content.type === 'text') {
          text += content.text
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      logs.push(log('info', 'Deep Analysis', `Received response (${text.length} chars) in ${elapsed}s`))

      // Strip markdown fences if present
      text = text.trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }

      // Find the JSON array
      const arrStart = text.indexOf('[')
      const arrEnd = text.lastIndexOf(']')
      if (arrStart === -1 || arrEnd === -1) {
        logs.push(log('warning', 'Deep Analysis', `No JSON array found in response from ${provider.provider}`))
        continue
      }

      const jsonStr = text.slice(arrStart, arrEnd + 1)
      let parsed: unknown[]

      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseErr) {
        logs.push(
          log(
            'warning',
            'Deep Analysis',
            `JSON parse error from ${provider.provider}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
          )
        )
        continue
      }

      if (!Array.isArray(parsed)) {
        logs.push(log('warning', 'Deep Analysis', `Parsed result is not an array from ${provider.provider}`))
        continue
      }

      // Validate and coerce each item to DeepAnalysis
      const insights: DeepAnalysis[] = parsed
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item, idx) => ({
          rank: typeof item.rank === 'number' ? item.rank : idx + 1,
          title: String(item.title ?? 'Untitled'),
          type: item.type === 'makeItBetter' ? 'makeItBetter' as const : 'greenfield' as const,
          problem: String(item.problem ?? ''),
          solution: String(item.solution ?? ''),
          viability: typeof item.viability === 'number' ? Math.min(100, Math.max(1, item.viability)) : 50,
          market: String(item.market ?? 'unknown'),
          difficulty: (['weekend', 'week', 'month'].includes(String(item.difficulty))
            ? String(item.difficulty)
            : 'month') as 'weekend' | 'week' | 'month',
          monthlyRevenue: String(item.monthlyRevenue ?? 'unknown'),
          competitors: Array.isArray(item.competitors) ? item.competitors.map(String) : [],
          competitorWeakness: String(item.competitorWeakness ?? ''),
          moat: String(item.moat ?? ''),
          pricing: String(item.pricing ?? ''),
          firstCustomers: String(item.firstCustomers ?? ''),
          validationStep: String(item.validationStep ?? ''),
          redFlag: String(item.redFlag ?? ''),
          evidence: typeof item.evidence === 'number' ? item.evidence : 1,
        }))

      logs.push(log('success', 'Deep Analysis', `Successfully extracted ${insights.length} deep insights`))
      return { insights, logs }
    } catch (e) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const msg = e instanceof Error ? e.message : String(e)
      logs.push(log('error', 'Deep Analysis', `${provider.provider} failed after ${elapsed}s: ${msg}`))

      // If rate-limited, wait before trying next provider
      if (msg.includes('429') || msg.includes('rate')) {
        logs.push(log('warning', 'Deep Analysis', 'Rate limited, waiting 5s before next attempt...'))
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }

  // All providers failed
  logs.push(log('error', 'Deep Analysis', 'All providers failed. No deep analysis available.'))
  return { insights: [], logs }
}
