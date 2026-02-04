'use client';

import { OpportunityType } from '@/lib/types';

interface TypeBadgeProps {
  type: OpportunityType;
  className?: string;
}

export default function TypeBadge({ type, className = '' }: TypeBadgeProps) {
  const isGreenfield = type === 'GREENFIELD';

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${isGreenfield
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }
        ${className}
      `}
    >
      {isGreenfield ? 'GREENFIELD' : 'MAKE IT BETTER'}
    </span>
  );
}
