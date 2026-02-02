/**
 * Pipeline v3 - Focused Opportunity Discovery
 *
 * Key changes:
 * - Only searches for explicit tool-seeking posts
 * - Aggressive pre-filtering before AI
 * - Simple YES/NO AI validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { collectOpportunities, RawOpportunity } from '@/lib/opportunity-collector'

interface ValidatedOpportunity {
  title: string
  problem: string
  evidence: string
  target_audience: string
  pain_score: number
  gap_score: number
  category: string[]
  source: RawOpportunity
}

/**
 * Simple, focused AI validation
 */
async function validateWithAI(
  opportunities: RawOpportunity[],
  groq: Groq
): Promise<{ validated: ValidatedOpportunity[]; rejected: number; errors: number }> {
  const validated: ValidatedOpportunity[] = []
  let rejected = 0
  let errors = 0

  for (const opp of opportunities) {
    try {
      console.log(`\nValidating: "${opp.title.slice(0, 50)}..."`)

      const prompt = `Analyze this post. Is someone SEEKING a software solution that doesn't exist yet?

TITLE: ${opp.title}
CONTENT: ${opp.text.slice(0, 600)}
SOURCE: ${opp.source} (${opp.score} upvotes)

REJECT if:
- This is announcing an EXISTING product ("I built", "launched", "check out")
- This is advice/tips (not seeking a solution)
- This is a coding question (how to implement X)
- A well-known solution already exists (name it if so)
- The problem is too vague to build a product for

ACCEPT if:
- Someone explicitly needs a tool/app/software that doesn't exist
- There's a specific, quantified pain point
- A solo developer could realistically build this

Response (JSON only):
{
  "accept": true/false,
  "reason": "One sentence explanation",
  "existingSolution": "Name of existing tool if any, or null",

  // Only if accept=true:
  "title": "Product name (2-3 words)",
  "problem": "What they need (1 sentence)",
  "evidence": "Direct quote showing the pain",
  "target_audience": "Who has this problem",
  "pain_score": 1-10,
  "gap_score": 1-10,
  "category": ["saas", "automation", "devtool", "b2b", "productivity"]
}`

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
      })

      const text = completion.choices[0]?.message?.content || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        if (result.accept === true) {
          console.log(`  ✅ ACCEPT: ${result.title} (pain:${result.pain_score}, gap:${result.gap_score})`)
          validated.push({
            title: result.title,
            problem: result.problem,
            evidence: result.evidence,
            target_audience: result.target_audience,
            pain_score: result.pain_score,
            gap_score: result.gap_score,
            category: result.category || ['other'],
            source: opp,
          })
        } else {
          rejected++
          const existing = result.existingSolution ? ` (Exists: ${result.existingSolution})` : ''
          console.log(`  ❌ REJECT: ${result.reason}${existing}`)
        }
      }

      await new Promise(r => setTimeout(r, 1500))
    } catch (e: unknown) {
      errors++
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('429') || msg.includes('rate')) {
        console.log('  ⚠️ Rate limited, stopping')
        break
      }
      console.log(`  ⚠️ Error: ${msg.slice(0, 50)}`)
    }
  }

  return { validated, rejected, errors }
}

/**
 * Check for duplicates in database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isDuplicate(supabase: any, title: string, url: string): Promise<boolean> {
  // Check URL
  const { data: urlMatch } = await supabase
    .from('opportunities')
    .select('id')
    .contains('sources', [{ url }])
    .limit(1)

  if (urlMatch?.length) return true

  // Check similar title
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!supabaseUrl || !supabaseKey || (!groqKey && !debugMode)) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const results = {
    version: 'v3',
    collected: 0,
    passedPreFilter: 0,
    aiValidated: 0,
    aiRejected: 0,
    duplicates: 0,
    added: 0,
    errors: 0,
    opportunities: [] as any[],
  }

  try {
    console.log('\n========================================')
    console.log('  PIPELINE v3 - FOCUSED SEARCH')
    console.log('========================================\n')

    // Step 1: Collect with focused searches
    const raw = await collectOpportunities()
    results.collected = raw.length
    results.passedPreFilter = raw.length // Pre-filter happens in collector

    if (raw.length === 0) {
      return NextResponse.json({ message: 'No opportunities found', ...results })
    }

    // Debug mode: return raw for manual review
    if (debugMode) {
      return NextResponse.json({
        message: 'Debug mode - raw opportunities',
        ...results,
        opportunities: raw.slice(0, 30).map((o, i) => ({
          index: i + 1,
          source: o.source,
          subreddit: o.subreddit,
          title: o.title,
          text: o.text.slice(0, 400),
          url: o.url,
          score: o.score,
        })),
      })
    }

    // Step 2: AI validation (limit to top 20 by score)
    const groq = new Groq({ apiKey: groqKey })
    const topOpportunities = raw.slice(0, 20)

    console.log(`\n[AI] Validating top ${topOpportunities.length} opportunities...`)
    const { validated, rejected, errors } = await validateWithAI(topOpportunities, groq)

    results.aiValidated = validated.length
    results.aiRejected = rejected
    results.errors = errors

    if (validated.length === 0) {
      return NextResponse.json({ message: 'No opportunities passed validation', ...results })
    }

    // Step 3: Save to database
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of validated) {
      const sourceUrl = opp.source.url

      if (await isDuplicate(supabase, opp.title, sourceUrl)) {
        results.duplicates++
        console.log(`  ⏭️ Duplicate: ${opp.title}`)
        continue
      }

      const dbEntry = {
        title: opp.title,
        summary: opp.problem,
        pain_score: opp.pain_score,
        trend_score: 5,
        gap_score: opp.gap_score,
        overall_score: Math.round((opp.pain_score * 0.5 + 5 * 0.2 + opp.gap_score * 0.3) * 10),
        category: opp.category,
        keywords: opp.title.toLowerCase().split(/\s+/),
        sources: [{
          platform: opp.source.source,
          url: opp.source.url,
          quote: opp.evidence,
          author: opp.source.author,
        }],
        competitors: [],
        trend_data: [],
        problem: opp.problem,
        target_audience: opp.target_audience,
      }

      const { error } = await supabase.from('opportunities').insert(dbEntry)
      if (error) {
        console.log(`  ⚠️ DB Error: ${error.message}`)
        results.errors++
      } else {
        results.added++
        results.opportunities.push({ title: opp.title, problem: opp.problem })
        console.log(`  💾 Saved: ${opp.title}`)
      }
    }

    console.log('\n========================================')
    console.log(`  RESULTS: ${results.added} added, ${results.aiRejected} rejected`)
    console.log('========================================\n')

    return NextResponse.json({ message: 'Pipeline complete', ...results })
  } catch (e) {
    console.error('Pipeline error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
