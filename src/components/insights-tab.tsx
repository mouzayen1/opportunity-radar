'use client'

import { cn } from '@/lib/utils'
import { ScoreRing } from '@/components/score-ring'
import type { DeepAnalysis } from '@/types'
import {
  Target,
  DollarSign,
  Shield,
  Users,
  Zap,
  AlertTriangle,
  TrendingUp,
  Check,
  Clock,
} from 'lucide-react'

interface InsightsTabProps {
  insights: DeepAnalysis[]
}

const difficultyConfig: Record<string, { label: string; color: string; bg: string }> = {
  weekend: { label: 'Weekend Project', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  week: { label: '1 Week Build', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  month: { label: '1 Month Build', color: 'text-orange-400', bg: 'bg-orange-500/15' },
}

const rankColors = [
  'text-yellow-400',
  'text-gray-300',
  'text-amber-600',
  'text-cyan-400',
  'text-emerald-400',
  'text-purple-400',
  'text-blue-400',
  'text-pink-400',
]

export function InsightsTab({ insights }: InsightsTabProps) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6b7280]">
        <TrendingUp className="h-10 w-10 mb-4 opacity-50" />
        <p className="text-sm">Deep analysis results will appear here after scanning</p>
        <p className="text-xs mt-1">Top 8 opportunities are analyzed in depth</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-[#6b7280] mb-2">
        {insights.length} deep-analyzed opportunities ranked by viability
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight, idx) => {
          const difficulty = difficultyConfig[insight.difficulty] || difficultyConfig.month
          const rankColor = rankColors[idx] || 'text-gray-400'

          return (
            <div
              key={idx}
              className="rounded-lg bg-[#12131a] border border-[#1e2030] p-5 transition-all duration-200 hover:bg-[#1a1b24] hover:border-[#2a2b3a]"
            >
              {/* Top row: rank + title + viability ring */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={cn('text-3xl font-bold', rankColor)}>#{insight.rank}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white mb-1">{insight.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                      insight.type === 'greenfield'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-purple-500/15 text-purple-400'
                    )}>
                      {insight.type === 'greenfield' ? 'Greenfield' : 'Improve Existing'}
                    </span>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', difficulty.bg, difficulty.color)}>
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {difficulty.label}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/15 text-cyan-400">
                      {insight.evidence} sources
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <ScoreRing score={insight.viability} size="sm" label="Viability" />
                </div>
              </div>

              {/* Problem */}
              <div className="mb-3">
                <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Problem</p>
                <p className="text-sm text-[#9ca3af] leading-relaxed">{insight.problem}</p>
              </div>

              {/* Solution / MVP */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-cyan-400" />
                  <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Solution / MVP Plan</p>
                </div>
                <p className="text-sm text-[#9ca3af] leading-relaxed">{insight.solution}</p>
              </div>

              {/* Market + Revenue */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[#0a0b0f] rounded-lg p-3 border border-[#1e2030]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-[#6b7280] uppercase font-medium">Market</span>
                  </div>
                  <p className="text-sm text-white font-medium">{insight.market}</p>
                </div>
                <div className="bg-[#0a0b0f] rounded-lg p-3 border border-[#1e2030]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-[#6b7280] uppercase font-medium">Monthly Revenue</span>
                  </div>
                  <p className="text-sm text-emerald-400 font-bold">{insight.monthlyRevenue}</p>
                </div>
              </div>

              {/* Competitors */}
              {insight.competitors && insight.competitors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Competitors</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {insight.competitors.map((comp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1e2030] text-[#9ca3af]">
                        {comp}
                      </span>
                    ))}
                  </div>
                  {insight.competitorWeakness && (
                    <p className="text-xs text-yellow-400/80 italic">Weakness: {insight.competitorWeakness}</p>
                  )}
                </div>
              )}

              {/* Moat */}
              {insight.moat && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="h-3 w-3 text-purple-400" />
                    <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Moat</p>
                  </div>
                  <p className="text-sm text-[#9ca3af]">{insight.moat}</p>
                </div>
              )}

              {/* Pricing */}
              {insight.pricing && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Pricing</p>
                  </div>
                  <p className="text-sm text-[#9ca3af]">{insight.pricing}</p>
                </div>
              )}

              {/* Find First Customers */}
              {insight.firstCustomers && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3 w-3 text-blue-400" />
                    <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Find First Customers</p>
                  </div>
                  <p className="text-sm text-[#9ca3af]">{insight.firstCustomers}</p>
                </div>
              )}

              {/* Validation Step - highlighted */}
              {insight.validationStep && (
                <div className="mb-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">This Week&apos;s Validation Step</p>
                  </div>
                  <p className="text-sm text-cyan-300">{insight.validationStep}</p>
                </div>
              )}

              {/* Red flag warning */}
              {insight.redFlag && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Red Flag</p>
                  </div>
                  <p className="text-sm text-red-300">{insight.redFlag}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
