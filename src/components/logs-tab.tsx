'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/types'
import { Terminal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogsTabProps {
  logs: LogEntry[]
  onClear: () => void
}

type LogFilter = 'all' | 'info' | 'success' | 'warning' | 'error'

const levelConfig: Record<LogEntry['level'], { color: string; bg: string; badge: string }> = {
  info: { color: 'text-gray-400', bg: 'bg-gray-500/15', badge: 'INFO' },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', badge: 'OK' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', badge: 'WARN' },
  error: { color: 'text-red-400', bg: 'bg-red-500/15', badge: 'ERR' },
}

export function LogsTab({ logs, onClear }: LogsTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<LogFilter>('all')

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  const filters: { value: LogFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: logs.length },
    { value: 'info', label: 'Info', count: logs.filter((l) => l.level === 'info').length },
    { value: 'success', label: 'Success', count: logs.filter((l) => l.level === 'success').length },
    { value: 'warning', label: 'Warning', count: logs.filter((l) => l.level === 'warning').length },
    { value: 'error', label: 'Error', count: logs.filter((l) => l.level === 'error').length },
  ]

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-[#12131a] rounded-lg p-1 border border-[#1e2030]">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                filter === f.value
                  ? 'bg-[#1a1b24] text-white'
                  : 'text-[#6b7280] hover:text-[#9ca3af]'
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className="ml-1 text-[10px] text-[#6b7280]">({f.count})</span>
              )}
            </button>
          ))}
        </div>

        <Button
          onClick={onClear}
          variant="ghost"
          size="xs"
          className="text-[#6b7280] hover:text-white"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Terminal container */}
      <div
        ref={scrollRef}
        className="bg-[#0a0b0f] border border-[#1e2030] rounded-lg p-3 h-[calc(100vh-240px)] overflow-y-auto font-mono text-xs scrollbar-dark"
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e2030]">
          <Terminal className="h-3.5 w-3.5 text-[#6b7280]" />
          <span className="text-[#6b7280] text-[10px]">OpportunityRadar Scanner Logs</span>
          <span className="text-[#6b7280] text-[10px] ml-auto">{filteredLogs.length} entries</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[#6b7280]">
            <p>No log entries{filter !== 'all' ? ` matching "${filter}" filter` : ''}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((log) => {
              const level = levelConfig[log.level]
              const timestamp = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-0.5 hover:bg-[#12131a] rounded px-1 transition-colors"
                >
                  <span className="text-[#6b7280] shrink-0 w-[68px]">{timestamp}</span>
                  <span className={cn('shrink-0 px-1.5 py-0 rounded text-[10px] font-bold', level.bg, level.color)}>
                    {level.badge}
                  </span>
                  <span className="text-cyan-400/60 shrink-0 min-w-[60px]">[{log.source}]</span>
                  <span className={cn('break-all', level.color)}>{log.message}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
