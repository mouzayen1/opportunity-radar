import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Database, Brain, Sparkles, RefreshCw } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">How OpportunityRadar Works</h1>
          <p className="text-xl text-zinc-400">
            We combine multiple data sources and AI analysis to surface startup opportunities that
            are worth your time.
          </p>
        </div>

        {/* Process Steps */}
        <div className="max-w-4xl mx-auto space-y-12 mb-20">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Database className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <div className="text-emerald-500 text-sm font-medium mb-2">Step 1</div>
              <h2 className="text-2xl font-bold mb-3">Collect Pain Points</h2>
              <p className="text-zinc-400 mb-4">
                We scan Hacker News discussions, GitHub issues, and app reviews to find real
                problems people are complaining about. No surveys, no guessing — just authentic
                frustrations from real users.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Hacker News
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  GitHub Issues
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  App Store Reviews
                </span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-cyan-500" />
            </div>
            <div>
              <div className="text-cyan-500 text-sm font-medium mb-2">Step 2</div>
              <h2 className="text-2xl font-bold mb-3">Analyze Trends</h2>
              <p className="text-zinc-400 mb-4">
                Every opportunity is cross-referenced with Google Trends data to understand if
                interest is growing, stable, or declining. Timing matters — we help you find
                problems that are becoming more urgent.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Google Trends
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Search Volume
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Growth Rate
                </span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <div className="text-purple-500 text-sm font-medium mb-2">Step 3</div>
              <h2 className="text-2xl font-bold mb-3">Identify Market Gaps</h2>
              <p className="text-zinc-400 mb-4">
                We research existing solutions and their weaknesses. If competitors have low
                ratings, common complaints, or obvious missing features — that&apos;s a gap you can
                fill.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Competitor Research
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Review Analysis
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Feature Gaps
                </span>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Brain className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <div className="text-yellow-500 text-sm font-medium mb-2">Step 4</div>
              <h2 className="text-2xl font-bold mb-3">AI-Powered Scoring</h2>
              <p className="text-zinc-400 mb-4">
                Google Gemini AI reviews and scores each opportunity based on all three signals.
                The result is a single score that tells you how promising an opportunity is — so
                you can focus on the best ones.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Gemini AI
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Quality Filter
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm">
                  Opportunity Score
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center border border-zinc-800 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Opportunity?</h2>
          <p className="text-zinc-400 mb-8">
            Browse our database of scored opportunities and find your next project.
          </p>
          <Link href="/browse">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 h-12"
            >
              Browse Opportunities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
