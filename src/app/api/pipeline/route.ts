/**
 * Pipeline API — OpportunityRadar v4
 *
 * Automated pipeline that runs on cron (daily at 8 AM UTC).
 * Collects, scores, deduplicates, and saves opportunities to Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { collectAll } from '@/lib/collectors'
import { runAllMissions } from '@/lib/ai-missions'
import { scoreOpportunities } from '@/lib/scoring'
import { deduplicateOpportunities } from '@/lib/dedup'
import type { RawOpportunity, ScoredOpportunity } from '@/types'

export const maxDuration = 120

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isDuplicate(
  supabase: any,
  title: string,
  url: string | null
): Promise<boolean> {
  // URL-based check
  if (url) {
    const { data: urlMatch } = await supabase
      .from('opportunities')
      .select('id')
      .contains('sources', [{ url }])
      .limit(1)

    if (urlMatch?.length) return true
  }

  // Title similarity check
  const { data: recent } = await supabase
    .from('opportunities')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(100)

  if (recent && Array.isArray(recent)) {
    const titleWords = new Set(
      title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    )
    for (const r of recent as Array<{ title: string }>) {
      const rWords = new Set(
        r.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      )
      const overlap = [...titleWords].filter(w => rWords.has(w)).length
      if (overlap / Math.max(titleWords.size, rWords.size) > 0.5) return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const debugMode = url.searchParams.get('debug') === 'true'
  const skipAI = url.searchParams.get('skip_ai') === 'true'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const results = {
    version: 'v4.0',
    collected: 0,
    fromAPIs: 0,
    fromAI: 0,
    scored: 0,
    afterDedup: 0,
    duplicates: 0,
    added: 0,
    errors: 0,
    opportunities: [] as Array<{ title: string; score: number }>,
  }

  try {
    console.log('\n========================================')
    console.log('  OPPORTUNITY PIPELINE v4.0')
    console.log('========================================\n')

    // Step 1: Collect from all APIs
    console.log('[Phase 1] Collecting from all APIs...')
    const collected = await collectAll()
    const apiResults = collected.results
    results.fromAPIs = apiResults.length
    console.log(`  Collected ${apiResults.length} from live APIs`)

    // Step 2: AI missions (unless skipped)
    let aiResults: RawOpportunity[] = []
    if (!skipAI) {
      console.log('[Phase 2] Running AI missions...')
      try {
        const missions = await runAllMissions()
        aiResults = missions.results
        results.fromAI = aiResults.length
        console.log(`  Collected ${aiResults.length} from AI missions`)
      } catch (e) {
        console.log(`  AI missions error: ${e instanceof Error ? e.message : e}`)
      }
    }

    const allRaw = [...apiResults, ...aiResults]
    results.collected = allRaw.length

    if (debugMode) {
      return NextResponse.json({
        message: 'Debug mode — raw results',
        ...results,
        rawSample: allRaw.slice(0, 30).map(r => ({
          title: r.title,
          source: r.source,
          type: r.type,
          engagement: r.engagement,
          recency: r.recency,
          url: r.url,
        })),
      })
    }

    if (allRaw.length === 0) {
      return NextResponse.json({ message: 'No results collected', ...results })
    }

    // Step 3: Score & dedup
    console.log('[Phase 3] Scoring and deduplicating...')
    const scored = scoreOpportunities(allRaw)
    results.scored = scored.length

    const deduped = deduplicateOpportunities(scored)
    results.afterDedup = deduped.length
    deduped.sort((a, b) => b.score - a.score)
    console.log(`  ${scored.length} scored, ${deduped.length} after dedup`)

    // Step 4: Save to Supabase
    console.log('[Phase 4] Saving to database...')
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of deduped) {
      try {
        if (await isDuplicate(supabase, opp.title, opp.url)) {
          results.duplicates++
          continue
        }

        const dbEntry = {
          title: opp.title,
          summary: opp.problem,
          pain_score: Math.round(opp.demandScore / 3), // Normalize to 0-10
          trend_score: Math.round(opp.recencyScore / 2), // Normalize to 0-10
          gap_score: Math.round(opp.buildabilityScore / 2), // Normalize to 0-10
          overall_score: opp.score,
          category: opp.industry ? [opp.industry] : ['opportunity'],
          keywords: opp.title.toLowerCase().split(/\s+/).filter(w => w.length > 2),
          sources: opp.url
            ? [{ platform: opp.source, url: opp.url, quote: opp.problem.slice(0, 200), author: opp.author || '' }]
            : [],
          competitors: (opp.competitors || []).map(c => ({ name: c, weakness: '' })),
          trend_data: [],
          problem: opp.problem,
          target_audience: opp.targetUser || opp.industry || '',
          opp_type: opp.type,
          engagement_level: opp.engagement,
          willingness_to_pay: opp.willingness_to_pay || '',
          build_complexity: opp.buildComplexity || '',
          source_count: opp.sourceCount || 1,
        }

        const { error } = await supabase.from('opportunities').insert(dbEntry)
        if (error) {
          console.log(`  DB error for "${opp.title}": ${error.message}`)
          results.errors++
        } else {
          results.added++
          results.opportunities.push({ title: opp.title, score: opp.score })
          console.log(`  Saved: ${opp.title} (score: ${opp.score})`)
        }
      } catch (e) {
        results.errors++
        console.log(`  Error saving: ${e instanceof Error ? e.message : e}`)
      }
    }

    console.log('\n========================================')
    console.log(`  RESULTS: ${results.added} added, ${results.duplicates} dupes, ${results.errors} errors`)
    console.log('========================================\n')

    return NextResponse.json({ message: 'Pipeline complete', ...results })
  } catch (e) {
    console.error('Pipeline error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
