'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { OpportunityCard } from '@/components/opportunity-card'
import type { ScoredOpportunity, FeedFilters, DataSourceType } from '@/types'
import { Search, Filter, TrendingUp } from 'lucide-react'

interface FeedTabProps {
  opportunities: ScoredOpportunity[]
  filters: FeedFilters
  onFiltersChange: (filters: FeedFilters) => void
}

const sourceOptions: { value: 'all' | DataSourceType; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'hackernews', label: 'Hacker News' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'github', label: 'GitHub' },
  { value: 'devto', label: 'Dev.to' },
  { value: 'stackoverflow', label: 'Stack Overflow' },
  { value: 'lobsters', label: 'Lobsters' },
  { value: 'producthunt', label: 'Product Hunt' },
  { value: 'indiehackers', label: 'Indie Hackers' },
  { value: 'ai_mission', label: 'AI Mission' },
]

const sortOptions: { value: FeedFilters['sort']; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'recency', label: 'Recency' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'buildability', label: 'Buildability' },
]

export function FeedTab({ opportunities, filters, onFiltersChange }: FeedTabProps) {
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities]

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((o) => o.type === filters.type)
    }

    // Source filter
    if (filters.source !== 'all') {
      filtered = filtered.filter((o) => o.source === filters.source)
    }

    // Engagement filter
    if (filters.engagement !== 'all') {
      filtered = filtered.filter((o) => o.engagement === filters.engagement)
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(search) ||
          o.problem.toLowerCase().includes(search)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'score':
          return b.score - a.score
        case 'recency':
          return a.recency - b.recency
        case 'engagement': {
          const engOrder = { high: 3, medium: 2, low: 1 }
          return (engOrder[b.engagement] || 0) - (engOrder[a.engagement] || 0)
        }
        case 'buildability':
          return b.buildabilityScore - a.buildabilityScore
        default:
          return b.score - a.score
      }
    })

    return filtered
  }, [opportunities, filters])

  const updateFilter = <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
        {/* Type filter buttons */}
        <div className="flex items-center gap-1 bg-[#12131a] rounded-lg p-1 border border-[#1e2030]">
          {(['all', 'greenfield', 'makeItBetter'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateFilter('type', type)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-200',
                filters.type === type
                  ? 'bg-[#1a1b24] text-white'
                  : 'text-[#6b7280] hover:text-[#9ca3af]'
              )}
            >
              {type === 'all' ? 'All' : type === 'greenfield' ? 'Greenfield' : 'Improve'}
            </button>
          ))}
        </div>

        {/* Source dropdown */}
        <select
          value={filters.source}
          onChange={(e) => updateFilter('source', e.target.value as FeedFilters['source'])}
          className="bg-[#12131a] border border-[#1e2030] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-cyan-500/50 transition-colors"
        >
          {sourceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Engagement filter */}
        <div className="flex items-center gap-1 bg-[#12131a] rounded-lg p-1 border border-[#1e2030]">
          {(['all', 'high', 'medium', 'low'] as const).map((eng) => (
            <button
              key={eng}
              onClick={() => updateFilter('engagement', eng)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                filters.engagement === eng
                  ? 'bg-[#1a1b24] text-white'
                  : 'text-[#6b7280] hover:text-[#9ca3af]'
              )}
            >
              {eng === 'all' ? 'All' : eng.charAt(0).toUpperCase() + eng.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <TrendingUp className="h-3.5 w-3.5 text-[#6b7280]" />
          <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value as FeedFilters['sort'])}
            className="bg-[#12131a] border border-[#1e2030] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-cyan-500/50 transition-colors"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full sm:w-56 bg-[#12131a] border border-[#1e2030] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#6b7280] focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Result count */}
      <div className="text-xs text-[#6b7280]">
        Showing {filteredOpportunities.length} of {opportunities.length} opportunities
      </div>

      {/* Opportunity cards grid */}
      {filteredOpportunities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b7280]">
          <Filter className="h-8 w-8 mb-3 opacity-50" />
          <p className="text-sm">No opportunities match your filters</p>
          <button
            onClick={() =>
              onFiltersChange({
                type: 'all',
                source: 'all',
                engagement: 'all',
                search: '',
                sort: 'score',
              })
            }
            className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
