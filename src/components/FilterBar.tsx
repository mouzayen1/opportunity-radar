'use client';

import { FilterParams, OpportunityType, Source, ComplaintType, Complexity } from '@/lib/types';

interface FilterBarProps {
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const updateFilter = <K extends keyof FilterParams>(key: K, value: FilterParams[K]) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Type toggle */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {(['ALL', 'GREENFIELD', 'MAKE_IT_BETTER'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateFilter('type', type)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.type === type
                  ? type === 'GREENFIELD'
                    ? 'bg-emerald-500 text-white'
                    : type === 'MAKE_IT_BETTER'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'GREENFIELD' ? 'Greenfield' : 'Make It Better'}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <select
          value={filters.source ?? 'ALL'}
          onChange={(e) => updateFilter('source', e.target.value as Source | 'ALL')}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">All Sources</option>
          <option value="hackernews">Hacker News</option>
          <option value="reddit">Reddit</option>
          <option value="github">GitHub</option>
        </select>

        {/* Complaint type filter (only for MAKE_IT_BETTER) */}
        {(filters.type === 'ALL' || filters.type === 'MAKE_IT_BETTER') && (
          <select
            value={filters.complaint_type ?? 'ALL'}
            onChange={(e) => updateFilter('complaint_type', e.target.value as ComplaintType | 'ALL')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Complaints</option>
            <option value="pricing">Pricing</option>
            <option value="missing_feature">Missing Feature</option>
            <option value="complexity">Complexity</option>
            <option value="performance">Performance</option>
            <option value="support">Support</option>
            <option value="reliability">Reliability</option>
            <option value="other">Other</option>
          </select>
        )}

        {/* Complexity filter */}
        <select
          value={filters.complexity ?? 'ALL'}
          onChange={(e) => updateFilter('complexity', e.target.value as Complexity | 'ALL')}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">All Complexity</option>
          <option value="weekend">Weekend</option>
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="major">Major</option>
        </select>

        {/* Min score */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Min score:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={filters.min_score ?? 0}
            onChange={(e) => updateFilter('min_score', parseInt(e.target.value) || 0)}
            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search opportunities..."
            value={filters.search ?? ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
