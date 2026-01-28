'use client'

import { useState, useEffect, useMemo } from 'react'
import { OpportunityCard } from '@/components/opportunity-card'
import { CategoryFilter } from '@/components/category-filter'
import { SearchInput } from '@/components/search-input'
import { SortSelect, SortOption } from '@/components/sort-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Opportunity } from '@/types/database'
import { Sparkles } from 'lucide-react'

export default function BrowsePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [sort, setSort] = useState<SortOption>('score')

  // Filter new opportunities (added in last 7 days)
  const newOpportunities = useMemo(() => {
    const now = new Date()
    return opportunities.filter(opp => {
      if (!opp.created_at) return false
      const created = new Date(opp.created_at)
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays <= 7
    })
  }, [opportunities])

  useEffect(() => {
    fetchOpportunities()
  }, [search, categories, sort])

  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categories.length > 0) params.set('categories', categories.join(','))
      params.set('sort', sort)

      const res = await fetch(`/api/opportunities?${params.toString()}`)
      const data = await res.json()
      setOpportunities(data.opportunities || [])
    } catch (error) {
      console.error('Failed to fetch opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Browse Opportunities</h1>
          <p className="text-zinc-400">
            Discover validated startup ideas scored by pain, trend, and market gap.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} />
            </div>
            <SortSelect value={sort} onChange={setSort} />
          </div>

          <CategoryFilter selected={categories} onChange={setCategories} />
        </div>

        {/* New This Week Section */}
        {!loading && newOpportunities.length > 0 && !search && categories.length === 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">New This Week</span>
              </div>
              <span className="text-sm text-zinc-500">{newOpportunities.length} fresh opportunities</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {newOpportunities.slice(0, 3).map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
            {newOpportunities.length > 3 && (
              <p className="mt-4 text-sm text-zinc-500">
                + {newOpportunities.length - 3} more new opportunities below
              </p>
            )}
            <div className="my-8 border-t border-zinc-800" />
          </div>
        )}

        {/* Results count */}
        <div className="mb-6 text-sm text-zinc-500">
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            `${opportunities.length} opportunities found`
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex gap-4 mb-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No opportunities found</h3>
            <p className="text-zinc-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
