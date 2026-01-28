'use client'

import { Badge } from '@/components/ui/badge'
import { CATEGORIES } from '@/types/database'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  selected: string[]
  onChange: (categories: string[]) => void
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const toggleCategory = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((c) => c !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant="secondary"
        className={cn(
          'cursor-pointer transition-colors',
          selected.length === 0
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        )}
        onClick={() => onChange([])}
      >
        All
      </Badge>
      {CATEGORIES.map((cat) => (
        <Badge
          key={cat.value}
          variant="secondary"
          className={cn(
            'cursor-pointer transition-colors',
            selected.includes(cat.value)
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          )}
          onClick={() => toggleCategory(cat.value)}
        >
          {cat.label}
        </Badge>
      ))}
    </div>
  )
}
