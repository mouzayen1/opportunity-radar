import type { RawOpportunity, DataSourceStatus, DataSourceType, LogEntry } from '@/types'
import { collectFromHackerNews } from './hackernews'
import { collectFromReddit } from './reddit'
import { collectFromDevTo } from './devto'
import { collectFromGitHub } from './github'
import { collectFromStackOverflow } from './stackoverflow'
import { collectFromLobsters } from './lobsters'

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

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `orchestrator-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'Orchestrator',
    message,
  }
}

export async function collectAll(): Promise<{
  results: RawOpportunity[]
  sources: DataSourceStatus[]
  logs: LogEntry[]
}> {
  const allResults: RawOpportunity[] = []
  const allLogs: LogEntry[] = []
  const sources: DataSourceStatus[] = []

  allLogs.push(createLog('info', `Starting collection from ${COLLECTORS.length} data sources...`))

  // Run ALL collectors in parallel using Promise.allSettled
  const startTime = Date.now()

  const settledResults = await Promise.allSettled(
    COLLECTORS.map(async (collector) => {
      const collectorStart = Date.now()
      try {
        const result = await collector.fn()
        const duration = Date.now() - collectorStart
        return {
          collector,
          result,
          duration,
        }
      } catch (err) {
        const duration = Date.now() - collectorStart
        throw { collector, err, duration }
      }
    })
  )

  // Process results
  for (const settled of settledResults) {
    if (settled.status === 'fulfilled') {
      const { collector, result, duration } = settled.value

      allResults.push(...result.results)
      allLogs.push(...result.logs)

      sources.push({
        name: collector.name,
        type: collector.type,
        status: 'success',
        resultCount: result.results.length,
        duration,
        timestamp: Date.now(),
      })
    } else {
      // Collector failed entirely -- extract info from the rejection
      const rejection = settled.reason as {
        collector: CollectorDef
        err: unknown
        duration: number
      }

      const errorMsg =
        rejection.err instanceof Error
          ? rejection.err.message
          : String(rejection.err)

      const isCors =
        errorMsg.includes('CORS') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Failed to fetch')

      allLogs.push(
        createLog(
          'error',
          `${rejection.collector.name} collector failed: ${errorMsg}`
        )
      )

      sources.push({
        name: rejection.collector.name,
        type: rejection.collector.type,
        status: isCors ? 'cors_blocked' : 'error',
        resultCount: 0,
        errorMessage: errorMsg,
        duration: rejection.duration,
        timestamp: Date.now(),
      })
    }
  }

  const totalDuration = Date.now() - startTime
  const successCount = sources.filter((s) => s.status === 'success').length
  const failCount = sources.filter((s) => s.status === 'error' || s.status === 'cors_blocked').length

  allLogs.push(
    createLog(
      'success',
      `Collection complete: ${allResults.length} opportunities from ${successCount}/${COLLECTORS.length} sources (${failCount} failed) in ${(totalDuration / 1000).toFixed(1)}s`
    )
  )

  return {
    results: allResults,
    sources,
    logs: allLogs,
  }
}

// Re-export individual collectors for standalone use
export { collectFromHackerNews } from './hackernews'
export { collectFromReddit } from './reddit'
export { collectFromDevTo } from './devto'
export { collectFromGitHub } from './github'
export { collectFromStackOverflow } from './stackoverflow'
export { collectFromLobsters } from './lobsters'
