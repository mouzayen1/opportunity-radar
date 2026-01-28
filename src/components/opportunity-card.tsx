import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Opportunity } from '@/types/database'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface OpportunityCardProps {
  opportunity: Opportunity
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const getTrendIcon = () => {
    if (opportunity.trend_score >= 7) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />
    } else if (opportunity.trend_score <= 3) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-zinc-500" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-zinc-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20'
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-zinc-500/10 border-zinc-500/20'
  }

  return (
    <Link href={`/opportunity/${opportunity.id}`}>
      <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900">
        {/* Score Badge */}
        <div
          className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border ${getScoreBgColor(opportunity.overall_score)}`}
        >
          <span className={`text-lg font-bold ${getScoreColor(opportunity.overall_score)}`}>
            {opportunity.overall_score}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 pr-16 text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
          {opportunity.title}
        </h3>

        {/* Summary */}
        <p className="mb-4 text-sm text-zinc-400 line-clamp-2">{opportunity.summary}</p>

        {/* Scores */}
        <div className="mb-4 flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Pain</span>
            <span className="text-sm font-medium text-white">{opportunity.pain_score}/10</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Trend</span>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="text-sm font-medium text-white">{opportunity.trend_score}/10</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Gap</span>
            <span className="text-sm font-medium text-white">{opportunity.gap_score}/10</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5">
          {opportunity.category.slice(0, 3).map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs"
            >
              {cat}
            </Badge>
          ))}
          {opportunity.category.length > 3 && (
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">
              +{opportunity.category.length - 3}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  )
}
