'use client';

import { useState, useEffect, useCallback } from 'react';
import { Opportunity, FilterParams, OpportunitiesResponse } from '@/lib/types';
import FilterBar from '@/components/FilterBar';
import OpportunityCard from '@/components/OpportunityCard';

export default function Home() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterParams>({
    type: 'ALL',
    source: 'ALL',
    complaint_type: 'ALL',
    complexity: 'ALL',
    min_score: 0,
    search: '',
    page: 1,
    pageSize: 20,
  });

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.type) params.set('type', filters.type);
      if (filters.source) params.set('source', filters.source);
      if (filters.complaint_type) params.set('complaint_type', filters.complaint_type);
      if (filters.complexity) params.set('complexity', filters.complexity);
      if (filters.min_score) params.set('min_score', filters.min_score.toString());
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/opportunities?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data: OpportunitiesResponse = await response.json();

      setOpportunities(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const totalPages = Math.ceil(total / (filters.pageSize ?? 20));

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
        <span>
          {loading ? 'Loading...' : `${total} opportunities found`}
        </span>
        {totalPages > 1 && (
          <span>
            Page {filters.page} of {totalPages}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && opportunities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No opportunities found</p>
          <p className="text-sm">Try adjusting your filters or run a collection first</p>
        </div>
      )}

      {/* Opportunity list */}
      {!loading && opportunities.length > 0 && (
        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page ?? 1) - 1) })}
            disabled={filters.page === 1}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const currentPage = filters.page ?? 1;
            let pageNum: number;

            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setFilters({ ...filters, page: pageNum })}
                className={`px-4 py-2 rounded-lg text-sm ${
                  currentPage === pageNum
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setFilters({ ...filters, page: Math.min(totalPages, (filters.page ?? 1) + 1) })}
            disabled={filters.page === totalPages}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
