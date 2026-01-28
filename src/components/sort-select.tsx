'use client'

import { ChevronDown } from 'lucide-react'

export type SortOption = 'score' | 'pain' | 'trend' | 'gap' | 'newest'

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Overall Score' },
  { value: 'pain', label: 'Pain Score' },
  { value: 'trend', label: 'Trend Score' },
  { value: 'gap', label: 'Gap Score' },
  { value: 'newest', label: 'Newest First' },
]

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-11 appearance-none rounded-md border border-zinc-800 bg-zinc-900 px-4 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
    </div>
  )
}
