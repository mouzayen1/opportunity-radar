/**
 * Opportunity Pipeline v2.1
 *
 * Uses pi-mono for multi-provider AI with key rotation.
 * Spreads load across Groq, Gemini, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel, complete, Context, getEnvApiKey } from '@mariozechner/pi-ai'
import { collectPainPoints, PainPoint } from '@/lib/pain-collector'
import { SCORING_GUIDE, calculateTotalScore, isQualifiedOpportunity, MIN_SCORE } from '@/lib/opportunity-criteria'

interface ScoredOpportunity {
  title: string
  problem: string
  existingSolutions: string[]
  solutionProblems: string[]
  targetAudience: string
  painClarity: number
  solutionGap: number
  willingnessToPay: number
  buildability: number
  validation: number
  totalScore: number
  evidence: string
  reasoning: string
  source: PainPoint
}

// Provider rotation config - uses free tiers
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

/**
 * AI Scoring with provider rotation
 */
async function scoreWithAI(
  painPoints: PainPoint[],
  providers: ProviderConfig[]
): Promise<{ scored: ScoredOpportunity[]; rejected: number; errors: number; apiCalls: number }> {
  const scored: ScoredOpportunity[] = []
  let rejected = 0
  let errors = 0
  let apiCalls = 0
  let consecutiveErrors = 0
  let providerIndex = 0

  console.log(`\n[PI-MONO] Available providers: ${providers.map(p => p.provider).join(', ')}`)

  for (const point of painPoints) {
    if (consecutiveErrors >= 3) {
      console.log(`\n🛑 STOPPING: ${consecutiveErrors} consecutive errors`)
      break
    }

    // Rotate through providers
    const currentProvider = providers[providerIndex % providers.length]
    providerIndex++

    try {
      apiCalls++
      console.log(`\n[${apiCalls}/${painPoints.length}] [${currentProvider.provider}] "${point.title.slice(0, 45)}..."`)

      const prompt = `You are a strict business opportunity evaluator. Follow the instructions EXACTLY.

## POST TO EVALUATE
Title: ${point.title}
Content: ${point.text.slice(0, 800)}
Engagement: ${point.score} upvotes, ${point.commentCount || 0} comments

${SCORING_GUIDE}

## REQUIRED RESPONSE FORMAT (JSON only, no other text)

You MUST follow the evaluation steps above, then output this JSON:

{
  "hardRejectReason": "null if passed, or explain which hard rejection condition was triggered",
  "existingSolutions": ["List ALL solutions you know of that solve this problem - be thorough"],
  "solutionProblems": ["Why existing solutions fail for THIS specific use case"] or [],
  "title": "Product name (2-4 words) or 'N/A' if rejecting",
  "problem": "Core problem (1 sentence)",
  "targetAudience": "Who has this problem",
  "painClarity": <1-10>,
  "solutionGap": <1-10>,
  "willingnessToPay": <1-10>,
  "buildability": <1-10>,
  "validation": <1-10>,
  "evidence": "Direct quote from post showing pain",
  "reasoning": "Explain your scores in 2-3 sentences. If rejecting, explain why."
}

CRITICAL RULES:
1. If market is saturated (AI writing, analytics, CRM, etc.) → solutionGap = 1-3
2. If person wants FREE → willingnessToPay = 1-2
3. If "overwhelmed by options" → solutionGap = 1-2 (solutions EXIST)
4. If curiosity question ("why is there no...") → willingnessToPay = 1-2
5. List AT LEAST 3 existing solutions if the market is established
6. Be skeptical - most posts are NOT good opportunities
7. **AUTOMATIC LOW GAP**: If you list 3+ existing solutions → solutionGap MUST be 1-5 (not higher)
8. **NO SYMPATHY SCORING**: Don't give high scores because you feel bad. Be ruthless.
9. Only score solutionGap >= 7 if person EXPLICITLY said they tried solutions and they FAILED`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = getModel(currentProvider.provider as any, currentProvider.model as any)
      const context: Context = {
        messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
      }

      const response = await complete(model, context, { temperature: 0.1, maxTokens: 600 })

      // Extract text from response
      let text = ''
      for (const content of response.content) {
        if (content.type === 'text') {
          text += content.text
        }
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        const totalScore = calculateTotalScore({
          painClarity: result.painClarity,
          solutionGap: result.solutionGap,
          willingnessToPay: result.willingnessToPay,
          buildability: result.buildability,
          validation: result.validation,
        })

        const isOpportunity = isQualifiedOpportunity(totalScore)

        console.log(`  Scores: pain=${result.painClarity}, gap=${result.solutionGap}, pay=${result.willingnessToPay}, build=${result.buildability}, valid=${result.validation}`)
        console.log(`  Total: ${totalScore}/100 (min: ${MIN_SCORE})`)

        if (isOpportunity) {
          console.log(`  ✅ QUALIFIED: ${result.title}`)
          scored.push({
            ...result,
            totalScore,
            source: point,
          })
        } else {
          rejected++
          const reason = result.solutionGap <= 3
            ? `Good solution exists (gap=${result.solutionGap})`
            : `Score too low (${totalScore})`
          console.log(`  ❌ REJECTED: ${reason}`)
        }
      }

      consecutiveErrors = 0
      await new Promise(r => setTimeout(r, 1000)) // Reduced delay with rotation
    } catch (e: unknown) {
      errors++
      consecutiveErrors++
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ⚠️ [${currentProvider.provider}] Error: ${msg.slice(0, 60)}`)

      if (msg.includes('429') || msg.includes('rate')) {
        console.log('  Waiting 5s before retry...')
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }

  console.log(`\n📊 API USAGE: ${apiCalls} calls made`)
  return { scored, rejected, errors, apiCalls }
}

/**
 * Check for duplicates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isDuplicate(supabase: any, title: string, url: string): Promise<boolean> {
  const { data: urlMatch } = await supabase
    .from('opportunities')
    .select('id')
    .contains('sources', [{ url }])
    .limit(1)

  if (urlMatch?.length) return true

  const { data: recent } = await supabase
    .from('opportunities')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(100)

  if (recent && Array.isArray(recent)) {
    const titleWords = new Set(title.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    for (const r of recent as Array<{ title: string }>) {
      const rWords = new Set(r.title.toLowerCase().split(/\s+/).filter(w => w.length > 3))
      const overlap = [...titleWords].filter(w => rWords.has(w)).length
      if (overlap / Math.max(titleWords.size, rWords.size) > 0.5) return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const debugMode = url.searchParams.get('debug') === 'true'
  const maxAnalyze = Math.min(parseInt(url.searchParams.get('limit') || '16'), 50)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check available providers
  const providers = getAvailableProviders()

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  if (providers.length === 0 && !debugMode) {
    return NextResponse.json({ error: 'No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY' }, { status: 500 })
  }

  console.log(`\n⚠️ CREDIT GUARD: Max ${maxAnalyze} AI calls`)
  console.log(`📡 Providers: ${providers.map(p => p.provider).join(', ') || 'none (debug mode)'}`)

  const results = {
    version: 'v2.1-pimono',
    minScore: MIN_SCORE,
    providers: providers.map(p => p.provider),
    collected: 0,
    analyzed: 0,
    qualified: 0,
    rejected: 0,
    duplicates: 0,
    added: 0,
    errors: 0,
    apiCalls: 0,
    opportunities: [] as Array<{
      title: string
      problem: string
      totalScore: number
      existingSolutions: string[]
      solutionProblems: string[]
    }>,
  }

  try {
    console.log('\n========================================')
    console.log('  OPPORTUNITY PIPELINE v2.1 (pi-mono)')
    console.log('  Multi-provider with key rotation')
    console.log(`  Minimum score: ${MIN_SCORE}/100`)
    console.log('========================================\n')

    // Step 1: Collect pain points
    const painPoints = await collectPainPoints()
    results.collected = painPoints.length

    if (painPoints.length === 0) {
      return NextResponse.json({ message: 'No pain points found', ...results })
    }

    // Debug mode: return raw for manual review
    if (debugMode) {
      return NextResponse.json({
        message: 'Debug mode - raw pain points',
        ...results,
        painPoints: painPoints.slice(0, 30).map((p, i) => ({
          index: i + 1,
          source: p.source,
          subreddit: p.subreddit,
          title: p.title,
          text: p.text.slice(0, 400),
          url: p.url,
          score: p.score,
          comments: p.commentCount,
          query: p.searchQuery,
        })),
      })
    }

    // Step 2: AI scoring with provider rotation
    const topPoints = painPoints.slice(0, maxAnalyze)
    results.analyzed = topPoints.length
    console.log(`[CREDIT GUARD] Analyzing ${topPoints.length}/${painPoints.length} (limit: ${maxAnalyze})`)

    const { scored, rejected, errors, apiCalls } = await scoreWithAI(topPoints, providers)

    results.qualified = scored.length
    results.rejected = rejected
    results.errors = errors
    results.apiCalls = apiCalls

    if (scored.length === 0) {
      return NextResponse.json({ message: 'No opportunities qualified', ...results })
    }

    // Step 3: Save to database
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of scored) {
      if (await isDuplicate(supabase, opp.title, opp.source.url)) {
        results.duplicates++
        console.log(`  ⏭️ Duplicate: ${opp.title}`)
        continue
      }

      const dbEntry = {
        title: opp.title,
        summary: opp.problem,
        pain_score: opp.painClarity,
        trend_score: opp.validation,
        gap_score: opp.solutionGap,
        overall_score: opp.totalScore,
        category: ['opportunity'],
        keywords: opp.title.toLowerCase().split(/\s+/),
        sources: [{
          platform: opp.source.source,
          url: opp.source.url,
          quote: opp.evidence,
          author: opp.source.author,
        }],
        competitors: opp.existingSolutions.map(s => ({ name: s, weakness: '' })),
        trend_data: [],
        problem: opp.problem,
        target_audience: opp.targetAudience,
        solution: opp.reasoning,
        market_size: `Scores: pain=${opp.painClarity}, gap=${opp.solutionGap}, pay=${opp.willingnessToPay}, build=${opp.buildability}, valid=${opp.validation}`,
        monetization: opp.solutionProblems.join('; '),
      }

      const { error } = await supabase.from('opportunities').insert(dbEntry)
      if (error) {
        console.log(`  ⚠️ DB Error: ${error.message}`)
        results.errors++
      } else {
        results.added++
        results.opportunities.push({
          title: opp.title,
          problem: opp.problem,
          totalScore: opp.totalScore,
          existingSolutions: opp.existingSolutions,
          solutionProblems: opp.solutionProblems,
        })
        console.log(`  💾 Saved: ${opp.title} (score: ${opp.totalScore})`)
      }
    }

    console.log('\n========================================')
    console.log(`  RESULTS`)
    console.log(`  Collected: ${results.collected}`)
    console.log(`  Analyzed: ${results.analyzed}`)
    console.log(`  API Calls: ${results.apiCalls}`)
    console.log(`  Qualified: ${results.qualified} (score >= ${MIN_SCORE})`)
    console.log(`  Rejected: ${results.rejected}`)
    console.log(`  Added: ${results.added}`)
    console.log('========================================\n')

    return NextResponse.json({ message: 'Pipeline complete', ...results })
  } catch (e) {
    console.error('Pipeline error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
