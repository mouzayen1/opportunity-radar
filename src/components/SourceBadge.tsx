'use client';

import { Source } from '@/lib/types';

interface SourceBadgeProps {
  source: Source;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const config = {
    hackernews: {
      label: 'HN',
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
    },
    reddit: {
      label: 'Reddit',
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
    github: {
      label: 'GitHub',
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
    },
  };

  const { label, bg, text, border } = config[source];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text} border ${border}`}
    >
      {label}
    </span>
  );
}
