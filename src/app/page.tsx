import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Target, TrendingUp, Layers, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-400 mb-8">
            <Zap className="h-4 w-4 text-emerald-500" />
            Data-driven opportunity discovery
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Find Ideas That Are{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Worth Building
            </span>
          </h1>

          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Stop guessing. Discover startup opportunities that are painful, trending, AND underserved
            — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/browse">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 h-12"
              >
                Browse Opportunities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 bg-transparent hover:bg-zinc-900 text-white font-medium px-8 h-12"
              >
                How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Signals Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">The 3-Signal Approach</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Most idea tools only show you problems. We show you problems that are growing and
            underserved — the sweet spot for new products.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/30 h-full">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Pain Signal</h3>
              <p className="text-zinc-400">
                Real complaints from Hacker News, GitHub issues, and app reviews. People actively
                struggling with problems.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/30 h-full">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trend Signal</h3>
              <p className="text-zinc-400">
                Google Trends data showing if interest is growing, stable, or declining. Timing
                matters.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/30 h-full">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Layers className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Gap Signal</h3>
              <p className="text-zinc-400">
                Analysis of existing solutions and their weaknesses. Find where competitors are
                falling short.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center border border-zinc-800 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Opportunity?</h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Browse hundreds of validated opportunities scored by pain, trend, and gap — updated
            regularly.
          </p>
          <Link href="/browse">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 h-12"
            >
              Start Browsing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="container mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>OpportunityRadar — Data-driven idea discovery for builders</p>
        </div>
      </footer>
    </div>
  )
}
