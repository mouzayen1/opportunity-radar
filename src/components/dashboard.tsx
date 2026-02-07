'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/header'
import { ScanProgress } from '@/components/scan-progress'
import { FeedTab } from '@/components/feed-tab'
import { InsightsTab } from '@/components/insights-tab'
import { SourcesTab } from '@/components/sources-tab'
import { LogsTab } from '@/components/logs-tab'
import type { ScanState, FeedFilters, LogEntry, ScoredOpportunity, DeepAnalysis, DataSourceStatus } from '@/types'

type TabType = 'feed' | 'insights' | 'sources' | 'logs'

const initialScanState: ScanState = {
  status: 'idle',
  phase: '',
  progress: 0,
  opportunities: [],
  insights: [],
  sources: [],
  logs: [],
  stats: {
    totalCollected: 0,
    totalScored: 0,
    totalDeduplicated: 0,
    totalAnalyzed: 0,
    apiCallsMade: 0,
    scanStartTime: 0,
  },
}

const initialFilters: FeedFilters = {
  type: 'all',
  source: 'all',
  engagement: 'all',
  search: '',
  sort: 'score',
}

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}

function addLog(
  logs: LogEntry[],
  level: LogEntry['level'],
  source: string,
  message: string
): LogEntry[] {
  return [
    ...logs,
    {
      id: generateLogId(),
      timestamp: Date.now(),
      level,
      source,
      message,
    },
  ]
}

export function Dashboard() {
  const [scanState, setScanState] = useState<ScanState>(initialScanState)
  const [activeTab, setActiveTab] = useState<TabType>('feed')
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(initialFilters)
  const scanTriggered = useRef(false)

  const startScan = useCallback(async () => {
    // Reset state for new scan
    setScanState((prev) => ({
      ...initialScanState,
      status: 'scanning',
      phase: 'Initializing scan...',
      progress: 2,
      logs: addLog([], 'info', 'scanner', 'Starting OpportunityRadar scan...'),
      stats: {
        ...initialScanState.stats,
        scanStartTime: Date.now(),
      },
    }))

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Scan API returned ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''

      // Handle streaming response (ndjson / text event stream)
      if (
        contentType.includes('text/event-stream') ||
        contentType.includes('application/x-ndjson') ||
        contentType.includes('text/plain')
      ) {
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body reader available')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(':')) continue

            // Handle SSE format (data: {...})
            const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed

            try {
              const event = JSON.parse(jsonStr)
              handleStreamEvent(event)
            } catch {
              // Skip non-JSON lines
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const jsonStr = buffer.trim().startsWith('data: ')
              ? buffer.trim().slice(6)
              : buffer.trim()
            const event = JSON.parse(jsonStr)
            handleStreamEvent(event)
          } catch {
            // Skip
          }
        }
      } else {
        // Handle standard JSON response
        const data = await response.json()
        handleBatchResponse(data)
      }

      // Mark scan as complete
      setScanState((prev) => ({
        ...prev,
        status: 'complete',
        phase: 'Scan complete',
        progress: 100,
        logs: addLog(prev.logs, 'success', 'scanner', `Scan complete. Found ${prev.opportunities.length} opportunities.`),
        stats: {
          ...prev.stats,
          scanEndTime: Date.now(),
        },
      }))
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      setScanState((prev) => ({
        ...prev,
        status: 'error',
        phase: `Error: ${errMsg}`,
        logs: addLog(prev.logs, 'error', 'scanner', `Scan failed: ${errMsg}`),
      }))
    }
  }, [])

  // Handle streaming events from the scan API
  const handleStreamEvent = useCallback((event: Record<string, unknown>) => {
    const type = event.type as string

    setScanState((prev) => {
      switch (type) {
        case 'phase':
        case 'status': {
          return {
            ...prev,
            phase: (event.phase as string) || (event.message as string) || prev.phase,
            progress: typeof event.progress === 'number' ? event.progress : prev.progress,
            status: event.status === 'analyzing' ? 'analyzing' : prev.status,
            logs: addLog(prev.logs, 'info', 'scanner', (event.phase as string) || (event.message as string) || ''),
          }
        }

        case 'source_start': {
          const sourceName = event.source as string
          const sourceType = event.sourceType as string
          const newSource: DataSourceStatus = {
            name: sourceName,
            type: sourceType as DataSourceStatus['type'],
            status: 'scanning',
            resultCount: 0,
            timestamp: Date.now(),
          }
          return {
            ...prev,
            sources: [...prev.sources.filter((s) => s.name !== sourceName), newSource],
            logs: addLog(prev.logs, 'info', sourceName, `Scanning ${sourceName}...`),
          }
        }

        case 'source_complete':
        case 'source_result': {
          const sourceName = event.source as string
          const resultCount = (event.count as number) || (event.resultCount as number) || 0
          const duration = event.duration as number | undefined
          return {
            ...prev,
            sources: prev.sources.map((s) =>
              s.name === sourceName
                ? { ...s, status: 'success' as const, resultCount, duration, timestamp: Date.now() }
                : s
            ),
            logs: addLog(prev.logs, 'success', sourceName, `Found ${resultCount} results${duration ? ` in ${duration}ms` : ''}`),
            stats: { ...prev.stats, totalCollected: prev.stats.totalCollected + resultCount },
          }
        }

        case 'source_error': {
          const sourceName = event.source as string
          const errorMsg = event.error as string
          const isCors = errorMsg?.toLowerCase().includes('cors')
          return {
            ...prev,
            sources: prev.sources.map((s) =>
              s.name === sourceName
                ? {
                    ...s,
                    status: (isCors ? 'cors_blocked' : 'error') as DataSourceStatus['status'],
                    errorMessage: errorMsg,
                    timestamp: Date.now(),
                  }
                : s
            ),
            logs: addLog(prev.logs, isCors ? 'warning' : 'error', sourceName, errorMsg || 'Unknown error'),
          }
        }

        case 'opportunities':
        case 'scored': {
          const opps = (event.opportunities || event.data || []) as ScoredOpportunity[]
          return {
            ...prev,
            opportunities: [...prev.opportunities, ...opps],
            logs: addLog(prev.logs, 'success', 'scorer', `Scored ${opps.length} opportunities`),
            stats: { ...prev.stats, totalScored: prev.stats.totalScored + opps.length },
          }
        }

        case 'insights':
        case 'analysis': {
          const insights = (event.insights || event.data || []) as DeepAnalysis[]
          return {
            ...prev,
            insights: [...prev.insights, ...insights],
            logs: addLog(prev.logs, 'success', 'analyzer', `Deep analysis complete for ${insights.length} opportunities`),
            stats: { ...prev.stats, totalAnalyzed: prev.stats.totalAnalyzed + insights.length },
          }
        }

        case 'log': {
          return {
            ...prev,
            logs: addLog(
              prev.logs,
              (event.level as LogEntry['level']) || 'info',
              (event.source as string) || 'scanner',
              (event.message as string) || ''
            ),
          }
        }

        case 'progress': {
          return {
            ...prev,
            progress: typeof event.progress === 'number' ? event.progress : prev.progress,
            phase: (event.phase as string) || prev.phase,
          }
        }

        case 'complete':
        case 'done': {
          const opps = event.opportunities as ScoredOpportunity[] | undefined
          const insights = event.insights as DeepAnalysis[] | undefined
          return {
            ...prev,
            status: 'complete',
            progress: 100,
            phase: 'Scan complete',
            opportunities: opps || prev.opportunities,
            insights: insights || prev.insights,
            logs: addLog(prev.logs, 'success', 'scanner', 'Scan pipeline finished'),
            stats: { ...prev.stats, scanEndTime: Date.now() },
          }
        }

        default:
          return prev
      }
    })
  }, [])

  // Handle batch (non-streaming) response
  const handleBatchResponse = useCallback((data: Record<string, unknown>) => {
    setScanState((prev) => {
      const opps = (data.opportunities || data.scored || []) as ScoredOpportunity[]
      const insights = (data.insights || data.analysis || []) as DeepAnalysis[]
      const sources = (data.sources || []) as DataSourceStatus[]
      const logs = (data.logs || []) as LogEntry[]

      return {
        ...prev,
        status: 'complete',
        phase: 'Scan complete',
        progress: 100,
        opportunities: opps,
        insights: insights,
        sources: sources.length > 0 ? sources : prev.sources,
        logs: logs.length > 0
          ? logs
          : addLog(prev.logs, 'success', 'scanner', `Batch result: ${opps.length} opportunities, ${insights.length} insights`),
        stats: {
          ...prev.stats,
          totalCollected: opps.length,
          totalScored: opps.length,
          totalAnalyzed: insights.length,
          scanEndTime: Date.now(),
        },
      }
    })
  }, [])

  // Auto-trigger scan on mount
  useEffect(() => {
    if (!scanTriggered.current) {
      scanTriggered.current = true
      startScan()
    }
  }, [startScan])

  const handleRescan = useCallback(() => {
    scanTriggered.current = true
    startScan()
  }, [startScan])

  const handleClearLogs = useCallback(() => {
    setScanState((prev) => ({ ...prev, logs: [] }))
  }, [])

  return (
    <div className="min-h-screen bg-radar">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        scanStatus={scanState.status}
        onRescan={handleRescan}
      />

      <ScanProgress
        phase={scanState.phase}
        progress={scanState.progress}
        status={scanState.status}
      />

      {/* Tab content */}
      <div className="container mx-auto px-4 py-4">
        {/* Stats bar when complete */}
        {scanState.status === 'complete' && scanState.stats.scanEndTime && (
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[#6b7280]">
            <span>
              Completed in{' '}
              <span className="text-white font-mono">
                {((scanState.stats.scanEndTime - scanState.stats.scanStartTime) / 1000).toFixed(1)}s
              </span>
            </span>
            <span className="text-[#1e2030]">|</span>
            <span>
              <span className="text-white font-mono">{scanState.opportunities.length}</span> opportunities
            </span>
            <span className="text-[#1e2030]">|</span>
            <span>
              <span className="text-white font-mono">{scanState.insights.length}</span> deep insights
            </span>
            <span className="text-[#1e2030]">|</span>
            <span>
              <span className="text-white font-mono">{scanState.sources.filter((s) => s.status === 'success').length}</span>/{scanState.sources.length} sources
            </span>
          </div>
        )}

        {activeTab === 'feed' && (
          <FeedTab
            opportunities={scanState.opportunities}
            filters={feedFilters}
            onFiltersChange={setFeedFilters}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab insights={scanState.insights} />
        )}

        {activeTab === 'sources' && (
          <SourcesTab sources={scanState.sources} />
        )}

        {activeTab === 'logs' && (
          <LogsTab logs={scanState.logs} onClear={handleClearLogs} />
        )}
      </div>
    </div>
  )
}
