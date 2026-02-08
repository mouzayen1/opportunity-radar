/**
 * Scan API — OpportunityRadar v4 (Streaming)
 *
 * Full scan pipeline with NDJSON streaming so the client gets
 * progressive updates instead of waiting for a single huge response.
 *
 * Each phase streams events as they happen:
 *   1. Collect from all free APIs (parallel, 8s timeout each)
 *   2. AI knowledge mining (4 fast missions)
 *   3. Score & deduplicate
 *   4. Deep analysis of top 10
 */

import { collectFromHackerNews } from '@/lib/collectors/hackernews'
import { collectFromReddit } from '@/lib/collectors/reddit'
import { collectFromDevTo } from '@/lib/collectors/devto'
import { collectFromGitHub } from '@/lib/collectors/github'
import { collectFromStackOverflow } from '@/lib/collectors/stackoverflow'
import { collectFromLobsters } from '@/lib/collectors/lobsters'
import { runMission } from '@/lib/ai-missions'
import { scoreOpportunities } from '@/lib/scoring'
import { deduplicateOpportunities } from '@/lib/dedup'
import { runDeepAnalysis } from '@/lib/deep-analysis'
import type { RawOpportunity, DataSourceType, LogEntry } from '@/types'

export const maxDuration = 60 // Vercel Hobby max

// Per-collector timeout (seconds)
const COLLECTOR_TIMEOUT_MS = 8000

// AI missions to run during scan (subset for speed — IDs from MISSIONS array)
// 1=Missing Tools, 2=Hated Tools, 4=Switching Signals, 5=Manual Workflows
const SCAN_MISSION_IDS = [1, 2, 4, 5]

interface CollectorDef {
  name: string
  type: DataSourceType
  fn: () => Promise<{ results: RawOpportunity[]; logs: LogEntry[] }>
}

const COLLECTORS: CollectorDef[] = [
  { name: 'HackerNews', type: 'hackernews', fn: collectFromHackerNews },
  { name: 'Reddit', type: 'reddit', fn: collectFromReddit },
  { name: 'Dev.to', type: 'devto', fn: collectFromDevTo },
  { name: 'GitHub', type: 'github', fn: collectFromGitHub },
  { name: 'StackOverflow', type: 'stackoverflow', fn: collectFromStackOverflow },
  { name: 'Lobsters', type: 'lobsters', fn: collectFromLobsters },
]

/** Race a promise against a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // Stream may have been closed
        }
      }

      const startTime = Date.now()
      const allResults: RawOpportunity[] = []

      try {
        // ============ PHASE 1: Live Data Harvest ============
        send({ type: 'phase', phase: 'Phase 1: Collecting from live APIs...', progress: 5 })

        // Launch all collectors in parallel with timeouts
        const collectorPromises = COLLECTORS.map(async (collector) => {
          send({ type: 'source_start', source: collector.name, sourceType: collector.type })
          const collectorStart = Date.now()

          try {
            const result = await withTimeout(
              collector.fn(),
              COLLECTOR_TIMEOUT_MS,
              collector.name
            )
            const duration = Date.now() - collectorStart

            send({
              type: 'source_complete',
              source: collector.name,
              count: result.results.length,
              duration,
            })

            return { results: result.results, name: collector.name }
          } catch (err) {
            const duration = Date.now() - collectorStart
            const errorMsg = err instanceof Error ? err.message : String(err)
            const isCors = errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')

            send({
              type: 'source_error',
              source: collector.name,
              error: errorMsg,
              isCors,
              duration,
            })

            return { results: [] as RawOpportunity[], name: collector.name }
          }
        })

        const collectorResults = await Promise.all(collectorPromises)
        for (const cr of collectorResults) {
          allResults.push(...cr.results)
        }

        send({
          type: 'phase',
          phase: `Phase 1 complete: ${allResults.length} results from APIs`,
          progress: 30,
        })

        // ============ PHASE 2: AI Knowledge Mining (4 fast missions) ============
        send({ type: 'phase', phase: 'Phase 2: AI knowledge mining...', progress: 35 })

        let aiResultCount = 0
        // Run missions in pairs for speed
        for (let i = 0; i < SCAN_MISSION_IDS.length; i += 2) {
          const batch = SCAN_MISSION_IDS.slice(i, i + 2)
          const missionPromises = batch.map(async (missionId) => {
            try {
              const results = await withTimeout(
                runMission(missionId),
                15000, // 15s per AI mission
                `AI mission #${missionId}`
              )
              send({
                type: 'log',
                level: 'success',
                source: 'AI Mission',
                message: `Mission #${missionId}: found ${results.length} opportunities`,
              })
              return results
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              send({
                type: 'log',
                level: 'warning',
                source: 'AI Mission',
                message: `Mission #${missionId} failed: ${msg}`,
              })
              return [] as RawOpportunity[]
            }
          })

          const batchResults = await Promise.all(missionPromises)
          for (const results of batchResults) {
            allResults.push(...results)
            aiResultCount += results.length
          }
        }

        send({
          type: 'phase',
          phase: `Phase 2 complete: ${aiResultCount} results from AI`,
          progress: 55,
        })

        // ============ PHASE 3: Score & Deduplicate ============
        send({ type: 'phase', phase: 'Phase 3: Scoring and deduplication...', progress: 60 })

        if (allResults.length === 0) {
          send({
            type: 'complete',
            opportunities: [],
            insights: [],
            stats: {
              totalCollected: 0,
              totalFromAPIs: 0,
              totalFromAI: 0,
              totalScored: 0,
              totalAfterDedup: 0,
              totalAnalyzed: 0,
              scanDurationMs: Date.now() - startTime,
            },
          })
          controller.close()
          return
        }

        const scored = scoreOpportunities(allResults)
        const deduped = deduplicateOpportunities(scored)
        deduped.sort((a, b) => b.score - a.score)

        send({
          type: 'phase',
          phase: `Phase 3 complete: ${deduped.length} unique opportunities (${scored.length - deduped.length} dupes removed)`,
          progress: 70,
        })

        // Send scored opportunities immediately so the feed populates
        send({
          type: 'opportunities',
          opportunities: deduped,
        })

        // ============ PHASE 4: Deep Analysis (top 10) ============
        send({ type: 'phase', phase: 'Phase 4: Deep analysis of top opportunities...', progress: 75, status: 'analyzing' })

        let insights: unknown[] = []
        const top10 = deduped.slice(0, 10)

        if (top10.length > 0) {
          try {
            const analysis = await withTimeout(
              runDeepAnalysis(top10),
              20000, // 20s for deep analysis
              'Deep Analysis'
            )
            insights = analysis.insights
            send({
              type: 'insights',
              insights: analysis.insights,
            })
            send({
              type: 'log',
              level: 'success',
              source: 'Deep Analysis',
              message: `Generated ${analysis.insights.length} deep insights`,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            send({
              type: 'log',
              level: 'warning',
              source: 'Deep Analysis',
              message: `Deep analysis skipped: ${msg}`,
            })
          }
        }

        // ============ DONE ============
        const scanDuration = Date.now() - startTime
        send({
          type: 'complete',
          stats: {
            totalCollected: allResults.length,
            totalFromAPIs: allResults.length - aiResultCount,
            totalFromAI: aiResultCount,
            totalScored: scored.length,
            totalAfterDedup: deduped.length,
            totalAnalyzed: insights.length,
            scanDurationMs: scanDuration,
          },
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        send({
          type: 'log',
          level: 'error',
          source: 'pipeline',
          message: `Fatal scan error: ${msg}`,
        })
        send({
          type: 'complete',
          opportunities: [],
          insights: [],
          error: msg,
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// POST handler (same logic, used by dashboard)
export async function POST() {
  return GET()
}
