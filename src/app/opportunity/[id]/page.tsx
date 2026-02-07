import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScoreRing } from '@/components/score-ring'
import { TrendChart } from '@/components/trend-chart'
import { ArrowLeft, ExternalLink, Target, TrendingUp, Layers, Quote, Users, DollarSign, Lightbulb, Wrench } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import type { Opportunity } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OpportunityPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const opportunity = data as unknown as Opportunity

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-12">
        {/* Back button */}
        <Link href="/browse" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Browse
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              {opportunity.category.map((cat: string) => (
                <Badge key={cat} variant="secondary" className="bg-zinc-800 text-zinc-300">
                  {cat}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold mb-4">{opportunity.title}</h1>
            <p className="text-xl text-zinc-400">{opportunity.summary}</p>
          </div>

          {/* Overall Score */}
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <ScoreRing score={opportunity.overall_score} size="lg" />
            <span className="text-sm text-zinc-500 mt-3">Overall Score</span>
          </div>
        </div>

        {/* Opportunity Details */}
        {(opportunity.problem || opportunity.solution) && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Problem & Solution */}
            <Card className="border-zinc-800 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-white">Problem & Solution</h3>
              </div>
              {opportunity.problem && (
                <div className="mb-4">
                  <p className="text-sm text-zinc-500 mb-1">Problem</p>
                  <p className="text-zinc-300">{opportunity.problem}</p>
                </div>
              )}
              {opportunity.solution && (
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Solution</p>
                  <p className="text-zinc-300">{opportunity.solution}</p>
                </div>
              )}
            </Card>

            {/* Market Info */}
            <Card className="border-zinc-800 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="font-semibold text-white">Market Info</h3>
              </div>
              {opportunity.target_audience && (
                <div className="mb-3">
                  <p className="text-sm text-zinc-500 mb-1">Target Audience</p>
                  <p className="text-zinc-300">{opportunity.target_audience}</p>
                </div>
              )}
              {opportunity.market_size && (
                <div className="mb-3">
                  <p className="text-sm text-zinc-500 mb-1">Market Size</p>
                  <p className="text-zinc-300">{opportunity.market_size}</p>
                </div>
              )}
              {opportunity.monetization && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <p className="text-emerald-400">{opportunity.monetization}</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* MVP Features & Unique Angle */}
        {((opportunity.mvp_features && opportunity.mvp_features.length > 0) || opportunity.unique_angle) && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {opportunity.mvp_features && opportunity.mvp_features.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-white">MVP Features</h3>
                </div>
                <ul className="space-y-2">
                  {opportunity.mvp_features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-blue-500 mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {opportunity.unique_angle && (
              <Card className="border-zinc-800 bg-zinc-900/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-yellow-500" />
                  </div>
                  <h3 className="font-semibold text-white">Unique Angle</h3>
                </div>
                <p className="text-zinc-300">{opportunity.unique_angle}</p>
              </Card>
            )}
          </div>
        )}

        {/* 3 Signals */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Pain Signal */}
          <Card className="border-zinc-800 bg-zinc-900/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pain Signal</h3>
                <p className="text-sm text-zinc-500">How much people struggle</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-red-500 mb-2">
              {opportunity.pain_score}/10
            </div>
            <p className="text-sm text-zinc-400">
              {opportunity.pain_score >= 8
                ? 'Severe pain - people are actively seeking solutions'
                : opportunity.pain_score >= 6
                ? 'Moderate pain - noticeable frustration'
                : 'Mild pain - inconvenience but manageable'}
            </p>
          </Card>

          {/* Trend Signal */}
          <Card className="border-zinc-800 bg-zinc-900/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Trend Signal</h3>
                <p className="text-sm text-zinc-500">Search interest over time</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-emerald-500 mb-2">
              {opportunity.trend_score}/10
            </div>
            <p className="text-sm text-zinc-400">
              {opportunity.trend_score >= 8
                ? 'Strong growth - interest is rising fast'
                : opportunity.trend_score >= 6
                ? 'Growing steadily - positive trajectory'
                : 'Stable or declining - timing may not be ideal'}
            </p>
          </Card>

          {/* Gap Signal */}
          <Card className="border-zinc-800 bg-zinc-900/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Gap Signal</h3>
                <p className="text-sm text-zinc-500">How weak competitors are</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-cyan-500 mb-2">
              {opportunity.gap_score}/10
            </div>
            <p className="text-sm text-zinc-400">
              {opportunity.gap_score >= 8
                ? 'Large gap - current solutions are inadequate'
                : opportunity.gap_score >= 6
                ? 'Notable gap - room for improvement'
                : 'Competitive - strong existing solutions'}
            </p>
          </Card>
        </div>

        {/* Trend Chart */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Trend Over Time</h2>
          <Card className="border-zinc-800 bg-zinc-900/30 p-6">
            <TrendChart data={opportunity.trend_data} height={200} />
          </Card>
        </div>

        {/* Sources */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Source Quotes</h2>
          <div className="space-y-4">
            {opportunity.sources.map((source: { platform: string; url: string; quote: string; author?: string }, index: number) => (
              <Card key={index} className="border-zinc-800 bg-zinc-900/30 p-6">
                <div className="flex items-start gap-4">
                  <Quote className="h-6 w-6 text-zinc-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-zinc-300 italic mb-3">&ldquo;{source.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {source.platform}
                      </Badge>
                      {source.author && (
                        <span className="text-zinc-500">— {source.author}</span>
                      )}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1"
                        >
                          View source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Competitors */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Competitor Analysis</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunity.competitors.map((comp: { name: string; rating?: number; weakness: string }, index: number) => (
              <Card key={index} className="border-zinc-800 bg-zinc-900/30 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{comp.name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm text-zinc-400">{comp.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-500">Weakness:</span> {comp.weakness}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {opportunity.keywords.map((keyword: string) => (
              <Badge
                key={keyword}
                variant="secondary"
                className="bg-zinc-800 text-zinc-300 text-sm py-1 px-3"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
