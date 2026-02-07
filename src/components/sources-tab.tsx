'use client'

import { cn } from '@/lib/utils'
import type { DataSourceStatus } from '@/types'
import { Check, X, AlertTriangle, Loader2, Clock, Layers } from 'lucide-react'

interface SourcesTabProps {
  sources: DataSourceStatus[]
}

const sourceIcons: Record<string, string> = {
  hackernews: 'HN',
  reddit: 'R',
  github: 'GH',
  devto: 'D',
  stackoverflow: 'SO',
  lobsters: 'L',
  producthunt: 'PH',
  indiehackers: 'IH',
  ai_mission: 'AI',
}

const sourceIconColors: Record<string, string> = {
  hackernews: 'bg-orange-500/20 text-orange-400',
  reddit: 'bg-blue-500/20 text-blue-400',
  github: 'bg-gray-500/20 text-gray-400',
  devto: 'bg-indigo-500/20 text-indigo-400',
  stackoverflow: 'bg-amber-500/20 text-amber-400',
  lobsters: 'bg-red-500/20 text-red-400',
  producthunt: 'bg-orange-600/20 text-orange-300',
  indiehackers: 'bg-blue-600/20 text-blue-300',
  ai_mission: 'bg-purple-500/20 text-purple-400',
}

function StatusIcon({ status }: { status: DataSourceStatus['status'] }) {
  switch (status) {
    case 'success':
      return <Check className="h-4 w-4 text-emerald-400" />
    case 'error':
      return <X className="h-4 w-4 text-red-400" />
    case 'cors_blocked':
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    case 'scanning':
      return <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
    case 'pending':
      return <Clock className="h-4 w-4 text-[#6b7280]" />
    default:
      return <Clock className="h-4 w-4 text-[#6b7280]" />
  }
}

function statusLabel(status: DataSourceStatus['status']): string {
  switch (status) {
    case 'success': return 'Success'
    case 'error': return 'Error'
    case 'cors_blocked': return 'CORS Blocked'
    case 'scanning': return 'Scanning'
    case 'pending': return 'Pending'
    default: return status
  }
}

export function SourcesTab({ sources }: SourcesTabProps) {
  const totalSources = sources.length
  const successful = sources.filter((s) => s.status === 'success').length
  const failed = sources.filter((s) => s.status === 'error' || s.status === 'cors_blocked').length
  const totalResults = sources.reduce((sum, s) => sum + s.resultCount, 0)

  return (
    <div className="space-y-4">
      {/* Summary stats bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Sources', value: totalSources, color: 'text-white' },
          { label: 'Successful', value: successful, color: 'text-emerald-400' },
          { label: 'Failed', value: failed, color: 'text-red-400' },
          { label: 'Total Results', value: totalResults, color: 'text-cyan-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2 bg-[#12131a] border border-[#1e2030] rounded-lg px-4 py-2"
          >
            <span className={cn('text-lg font-bold font-mono', stat.color)}>{stat.value}</span>
            <span className="text-xs text-[#6b7280]">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Source cards grid */}
      {sources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sources.map((source, idx) => {
            const icon = sourceIcons[source.type] || source.type.substring(0, 2).toUpperCase()
            const iconColor = sourceIconColors[source.type] || 'bg-gray-500/20 text-gray-400'

            return (
              <div
                key={idx}
                className={cn(
                  'rounded-lg bg-[#12131a] border border-[#1e2030] p-4 transition-all duration-200',
                  'hover:bg-[#1a1b24] hover:border-[#2a2b3a]'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold', iconColor)}>
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{source.name}</h4>
                      <p className={cn(
                        'text-[10px] font-medium',
                        source.status === 'success' ? 'text-emerald-400' :
                        source.status === 'error' ? 'text-red-400' :
                        source.status === 'cors_blocked' ? 'text-yellow-400' :
                        source.status === 'scanning' ? 'text-cyan-400' :
                        'text-[#6b7280]'
                      )}>
                        {statusLabel(source.status)}
                      </p>
                    </div>
                  </div>
                  <StatusIcon status={source.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0a0b0f] rounded-md px-2 py-1.5">
                    <p className="text-xs font-mono font-bold text-white">{source.resultCount}</p>
                    <p className="text-[10px] text-[#6b7280]">Results</p>
                  </div>
                  <div className="bg-[#0a0b0f] rounded-md px-2 py-1.5">
                    <p className="text-xs font-mono font-bold text-white">
                      {source.duration ? `${source.duration}ms` : '--'}
                    </p>
                    <p className="text-[10px] text-[#6b7280]">Duration</p>
                  </div>
                  <div className="bg-[#0a0b0f] rounded-md px-2 py-1.5">
                    <p className="text-xs font-mono font-bold text-white">
                      {source.timestamp
                        ? new Date(source.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </p>
                    <p className="text-[10px] text-[#6b7280]">Time</p>
                  </div>
                </div>

                {/* Error message */}
                {source.errorMessage && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-red-400 font-mono">{source.errorMessage}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b7280]">
          <Layers className="h-8 w-8 mb-3 opacity-50" />
          <p className="text-sm">No source data yet</p>
          <p className="text-xs mt-1">Sources will appear after scanning starts</p>
        </div>
      )}
    </div>
  )
}
