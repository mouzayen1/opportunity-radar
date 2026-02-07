/**
 * Scan API — OpportunityRadar v4
 *
 * Full scan pipeline: collect from all sources → AI missions → score → dedup → deep analysis
 * Returns results progressively via JSON streaming.
 */

import { NextResponse } from 'next/server'
import { collectAll } from '@/lib/collectors'
import { runAllMissions } from '@/lib/ai-missions'
import { scoreOpportunities } from '@/lib/scoring'
import { deduplicateOpportunities } from '@/lib/dedup'
import { runDeepAnalysis } from '@/lib/deep-analysis'
import type { RawOpportunity, ScoredOpportunity, DeepAnalysis, DataSourceStatus, LogEntry } from '@/types'

export const maxDuration = 120 // Allow up to 2 minutes for full scan

interface ScanResult {
  opportunities: ScoredOpportunity[]
  insights: DeepAnalysis[]
  sources: DataSourceStatus[]
  logs: LogEntry[]
  stats: {
    totalCollected: number
    totalFromAPIs: number
    totalFromAI: number
    totalScored: number
    totalAfterDedup: number
    totalAnalyzed: number
    scanDurationMs: number
  }
}

function makeLog(level: LogEntry['level'], source: string, message: string): LogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source,
    message,
  }
}

export async function GET() {
  const startTime = Date.now()
  const allLogs: LogEntry[] = []
  const allSources: DataSourceStatus[] = []

  allLogs.push(makeLog('info', 'pipeline', 'OpportunityRadar v4 scan started'))

  try {
    // ============ PHASE 1: Live Data Harvest ============
    allLogs.push(makeLog('info', 'pipeline', 'Phase 1: Live Data Harvest — hitting all free APIs simultaneously'))

    let apiResults: RawOpportunity[] = []
    try {
      const collected = await collectAll()
      apiResults = collected.results
      allSources.push(...collected.sources)
      allLogs.push(...collected.logs)
      allLogs.push(makeLog('success', 'pipeline', `Phase 1 complete: ${apiResults.length} results from live APIs`))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      allLogs.push(makeLog('error', 'pipeline', `Phase 1 error: ${msg}`))
    }

    // ============ PHASE 2: AI Knowledge Mining ============
    allLogs.push(makeLog('info', 'pipeline', 'Phase 2: AI Knowledge Mining — running 12 missions in batches'))

    let aiResults: RawOpportunity[] = []
    try {
      const missions = await runAllMissions()
      aiResults = missions.results
      allLogs.push(...missions.logs)
      allLogs.push(makeLog('success', 'pipeline', `Phase 2 complete: ${aiResults.length} results from AI missions`))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      allLogs.push(makeLog('warning', 'pipeline', `Phase 2 error (continuing with API results): ${msg}`))
    }

    // Merge all results
    const allResults: RawOpportunity[] = [...apiResults, ...aiResults]
    allLogs.push(makeLog('info', 'pipeline', `Total raw results: ${allResults.length} (${apiResults.length} API + ${aiResults.length} AI)`))

    if (allResults.length === 0) {
      allLogs.push(makeLog('warning', 'pipeline', 'No results collected from any source'))
      return NextResponse.json({
        opportunities: [],
        insights: [],
        sources: allSources,
        logs: allLogs,
        stats: {
          totalCollected: 0,
          totalFromAPIs: 0,
          totalFromAI: 0,
          totalScored: 0,
          totalAfterDedup: 0,
          totalAnalyzed: 0,
          scanDurationMs: Date.now() - startTime,
        },
      } satisfies ScanResult)
    }

    // ============ PHASE 3: Score & Deduplicate ============
    allLogs.push(makeLog('info', 'pipeline', 'Phase 3: Scoring and deduplication'))

    const scored = scoreOpportunities(allResults)
    allLogs.push(makeLog('info', 'scoring', `Scored ${scored.length} opportunities`))

    const deduped = deduplicateOpportunities(scored)
    allLogs.push(makeLog('info', 'dedup', `After dedup: ${deduped.length} unique opportunities (removed ${scored.length - deduped.length} duplicates)`))

    // Sort by score descending
    deduped.sort((a, b) => b.score - a.score)

    allLogs.push(makeLog('success', 'pipeline', `Phase 3 complete: ${deduped.length} scored & deduplicated opportunities`))

    // ============ PHASE 4: Deep Analysis ============
    allLogs.push(makeLog('info', 'pipeline', 'Phase 4: Deep analysis of top opportunities'))

    let insights: DeepAnalysis[] = []
    const top30 = deduped.slice(0, 30)

    if (top30.length > 0) {
      try {
        const analysis = await runDeepAnalysis(top30)
        insights = analysis.insights
        allLogs.push(...analysis.logs)
        allLogs.push(makeLog('success', 'pipeline', `Phase 4 complete: ${insights.length} deep insights generated`))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        allLogs.push(makeLog('warning', 'pipeline', `Deep analysis error (returning scored results): ${msg}`))
      }
    }

    // ============ DONE ============
    const scanDuration = Date.now() - startTime
    allLogs.push(makeLog('success', 'pipeline', `Scan complete in ${(scanDuration / 1000).toFixed(1)}s`))

    const result: ScanResult = {
      opportunities: deduped,
      insights,
      sources: allSources,
      logs: allLogs,
      stats: {
        totalCollected: allResults.length,
        totalFromAPIs: apiResults.length,
        totalFromAI: aiResults.length,
        totalScored: scored.length,
        totalAfterDedup: deduped.length,
        totalAnalyzed: insights.length,
        scanDurationMs: scanDuration,
      },
    }

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    allLogs.push(makeLog('error', 'pipeline', `Fatal scan error: ${msg}`))

    return NextResponse.json(
      {
        opportunities: [],
        insights: [],
        sources: allSources,
        logs: allLogs,
        stats: {
          totalCollected: 0,
          totalFromAPIs: 0,
          totalFromAI: 0,
          totalScored: 0,
          totalAfterDedup: 0,
          totalAnalyzed: 0,
          scanDurationMs: Date.now() - startTime,
        },
        error: msg,
      },
      { status: 500 }
    )
  }
}

// POST handler (same logic, used by dashboard)
export async function POST() {
  return GET()
}
