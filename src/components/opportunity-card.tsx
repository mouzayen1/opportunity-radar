'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ScoredOpportunity } from '@/types'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
} from 'lucide-react'

interface OpportunityCardProps {
  opportunity: ScoredOpportunity
}

const sourceColors: Record<string, { bg: string; text: string; label: string }> = {
  hackernews: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'HN' },
  reddit: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Reddit' },
  github: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'GitHub' },
  devto: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', label: 'Dev.to' },
  stackoverflow: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'SO' },
  lobsters: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Lobsters' },
  producthunt: { bg: 'bg-orange-600/15', text: 'text-orange-300', label: 'PH' },
  indiehackers: { bg: 'bg-blue-600/15', text: 'text-blue-300', label: 'IH' },
  ai_mission: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'AI' },
}

const engagementColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  low: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false)

  const borderColor = opportunity.type === 'greenfield' ? '#10b981' : '#8b5cf6'
  const source = sourceColors[opportunity.source] || sourceColors.ai_mission
  const engagement = engagementColors[opportunity.engagement] || engagementColors.low

  return (
    <div
      className={cn(
        'relative rounded-lg bg-[#12131a] border border-[#1e2030] transition-all duration-200 cursor-pointer',
        'hover:bg-[#1a1b24] hover:border-[#2a2b3a]',
        expanded && 'bg-[#1a1b24] border-[#2a2b3a]'
      )}
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Score pill - top right */}
      <div className="absolute top-3 right-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold',
          opportunity.score >= 80
            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
            : opportunity.score >= 60
              ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30'
              : 'bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/30'
        )}>
          {opportunity.score}
        </div>
      </div>

      <div className="p-4 pr-16">
        {/* Title */}
        <h3 className="text-sm font-semibold text-white mb-1.5 leading-tight">
          {opportunity.title}
        </h3>

        {/* Problem preview */}
        <p className="text-xs text-[#9ca3af] line-clamp-2 mb-3 leading-relaxed">
          {opportunity.problem}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', source.bg, source.text)}>
            {source.label}
          </span>
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', engagement.bg, engagement.text)}>
            {opportunity.engagement}
          </span>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
            opportunity.type === 'greenfield'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-purple-500/15 text-purple-400'
          )}>
            {opportunity.type === 'greenfield' ? 'Greenfield' : 'Improve'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 pb-4 pt-1 border-t border-[#1e2030] space-y-3">
          {/* Full problem */}
          <div>
            <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Problem</p>
            <p className="text-sm text-[#9ca3af] leading-relaxed">{opportunity.problem}</p>
          </div>

          {/* Workaround */}
          {opportunity.workaround && (
            <div>
              <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Current Workaround</p>
              <p className="text-sm text-[#9ca3af]">{opportunity.workaround}</p>
            </div>
          )}

          {/* Existing tools */}
          {opportunity.existingTool && (
            <div>
              <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Existing Tool</p>
              <p className="text-sm text-[#9ca3af]">{opportunity.existingTool}</p>
            </div>
          )}

          {/* Competitors */}
          {opportunity.competitors && opportunity.competitors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Competitors</p>
              <div className="flex flex-wrap gap-1">
                {opportunity.competitors.map((comp, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1e2030] text-[#9ca3af]">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Willingness to pay */}
          {opportunity.willingness_to_pay && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm text-emerald-400">{opportunity.willingness_to_pay}</span>
            </div>
          )}

          {/* Score breakdown */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {[
              { label: 'Demand', value: opportunity.demandScore, max: 30 },
              { label: 'Recency', value: opportunity.recencyScore, max: 20 },
              { label: 'Build', value: opportunity.buildabilityScore, max: 20 },
              { label: 'Source', value: opportunity.sourceQualityScore, max: 15 },
              { label: 'Market', value: opportunity.marketSignalScore, max: 15 },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xs font-mono text-white">{s.value}/{s.max}</div>
                <div className="text-[10px] text-[#6b7280]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* URL link */}
          {opportunity.url && (
            <a
              href={opportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              View source
            </a>
          )}
        </div>
      </div>

      {/* Expand indicator */}
      <div className="flex justify-center pb-1">
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[#6b7280]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#6b7280]" />
        )}
      </div>
    </div>
  )
}
