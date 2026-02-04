'use client';

import { useState } from 'react';
import { Opportunity } from '@/lib/types';
import TypeBadge from './TypeBadge';
import SourceBadge from './SourceBadge';
import ComplaintBadge from './ComplaintBadge';
import ScoreBar from './ScoreBar';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isGreenfield = opportunity.opportunity_type === 'GREENFIELD';

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={opportunity.opportunity_type} />
          <SourceBadge source={opportunity.source} />
          {!isGreenfield && opportunity.complaint_type && (
            <ComplaintBadge type={opportunity.complaint_type} />
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-white">
            {opportunity.overall_score ?? '-'}
          </div>
          <div className="text-xs text-gray-500">score</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
        <a
          href={opportunity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-400 transition-colors"
        >
          {opportunity.title}
        </a>
      </h3>

      {/* Summary */}
      {opportunity.summary && (
        <p className="text-gray-300 text-sm mb-3">{opportunity.summary}</p>
      )}

      {/* Type-specific content */}
      <div className="mb-4 text-sm">
        {isGreenfield ? (
          opportunity.problem_description && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
              <span className="text-emerald-400 font-medium">Problem: </span>
              <span className="text-gray-300">{opportunity.problem_description}</span>
            </div>
          )
        ) : (
          opportunity.existing_solution && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
              <span className="text-blue-400 font-medium">Competing with: </span>
              <span className="text-gray-300">{opportunity.existing_solution}</span>
            </div>
          )
        )}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
        <ScoreBar label="Pain" score={opportunity.pain_score ?? 0} />
        <ScoreBar label="Market" score={opportunity.market_score ?? 0} />
        <ScoreBar label="Feasibility" score={opportunity.feasibility_score ?? 0} />
        <ScoreBar label="Urgency" score={opportunity.urgency_score ?? 0} />
        {!isGreenfield && opportunity.replacement_score !== undefined && (
          <ScoreBar label="Replace" score={opportunity.replacement_score} />
        )}
        <ScoreBar label="Recency" score={opportunity.recency_score ?? 0} />
      </div>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-4">
          <span>{opportunity.upvotes} upvotes</span>
          <span>{opportunity.comments_count} comments</span>
          {opportunity.complexity && (
            <span className="capitalize">{opportunity.complexity} project</span>
          )}
        </div>
        <span>{formatDate(opportunity.posted_at)}</span>
      </div>

      {/* Target market */}
      {opportunity.target_market && (
        <div className="text-xs text-gray-400 mb-3">
          <span className="font-medium">Target: </span>
          {opportunity.target_market}
        </div>
      )}

      {/* Expandable raw text */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        {expanded ? 'Hide original' : 'Show original'}
      </button>

      {expanded && (
        <div className="mt-3 p-3 bg-gray-800 rounded text-xs text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {opportunity.raw_text || '(no content)'}
        </div>
      )}
    </div>
  );
}
