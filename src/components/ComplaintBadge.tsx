'use client';

import { ComplaintType } from '@/lib/types';

interface ComplaintBadgeProps {
  type: ComplaintType;
}

export default function ComplaintBadge({ type }: ComplaintBadgeProps) {
  const labels: Record<ComplaintType, string> = {
    pricing: 'Pricing',
    missing_feature: 'Missing Feature',
    complexity: 'Complexity',
    performance: 'Performance',
    support: 'Support',
    reliability: 'Reliability',
    other: 'Other',
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
      {labels[type]}
    </span>
  );
}
