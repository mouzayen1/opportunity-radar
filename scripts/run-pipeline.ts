/**
 * OpportunityRadar Data Pipeline
 *
 * Main script that orchestrates the entire data collection and analysis pipeline.
 * Run this periodically (e.g., weekly) to discover new opportunities.
 *
 * Usage:
 *   npx ts-node scripts/run-pipeline.ts
 *
 * Environment variables needed:
 *   - GEMINI_API_KEY
 *   - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { fetchHackerNewsPainPoints } from './fetch-hackernews'
import { fetchGitHubPainPoints } from './fetch-github-issues'
import { analyzeWithGemini } from './analyze-with-gemini'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

interface AnalyzedOpportunityWithTrends {
  title: string
  summary: string
  pain_score: number
  trend_score: number
  gap_score: number
  overall_score: number
  category: string[]
  keywords: string[]
  sources: any[]
  competitors: any[]
  trend_data?: any[]
}

async function saveToSupabase(opportunities: AnalyzedOpportunityWithTrends[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`Saving ${opportunities.length} opportunities to Supabase...`)

  for (const opp of opportunities) {
    // Check if similar opportunity already exists (by title similarity)
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id, title')
      .ilike('title', `%${opp.title.split(' ').slice(0, 3).join(' ')}%`)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`Skipping duplicate: ${opp.title}`)
      continue
    }

    // Generate fake trend data for now (will be replaced with real Google Trends data)
    const trendData = generateTrendData()

    const { error } = await supabase.from('opportunities').insert({
      title: opp.title,
      summary: opp.summary,
      pain_score: opp.pain_score,
      trend_score: opp.trend_score,
      gap_score: opp.gap_score,
      overall_score: opp.overall_score,
      category: opp.category,
      keywords: opp.keywords,
      sources: opp.sources,
      competitors: opp.competitors,
      trend_data: trendData,
    })

    if (error) {
      console.error(`Failed to save ${opp.title}:`, error.message)
    } else {
      console.log(`Saved: ${opp.title}`)
    }
  }

  console.log('Done saving to Supabase')
}

function generateTrendData(): Array<{ date: string; value: number }> {
  // Generate realistic-looking trend data
  const data = []
  const now = new Date()
  let value = 30 + Math.random() * 30 // Start between 30-60

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)

    // Add some randomness with general upward trend
    value = Math.min(100, Math.max(10, value + (Math.random() - 0.3) * 15))

    data.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(value),
    })
  }

  return data
}

async function main() {
  console.log('=== OpportunityRadar Pipeline ===\n')

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    console.error('GEMINI_API_KEY not set. Please check your .env.local file.')
    process.exit(1)
  }

  // Step 1: Collect pain points from various sources
  console.log('\n--- Step 1: Collecting Pain Points ---\n')

  const hnPainPoints = await fetchHackerNewsPainPoints(30)
  console.log(`Collected ${hnPainPoints.length} pain points from Hacker News`)

  let ghPainPoints: any[] = []
  try {
    ghPainPoints = await fetchGitHubPainPoints(20)
    console.log(`Collected ${ghPainPoints.length} pain points from GitHub`)
  } catch (error) {
    console.log('GitHub collection skipped (gh CLI may not be available)')
  }

  const allPainPoints = [...hnPainPoints, ...ghPainPoints]
  console.log(`\nTotal pain points collected: ${allPainPoints.length}`)

  if (allPainPoints.length === 0) {
    console.log('No pain points collected. Exiting.')
    return
  }

  // Step 2: Analyze with Gemini
  console.log('\n--- Step 2: Analyzing with Gemini AI ---\n')

  const opportunities = await analyzeWithGemini(allPainPoints, geminiKey)
  console.log(`\nValid opportunities found: ${opportunities.length}`)

  if (opportunities.length === 0) {
    console.log('No valid opportunities found. Exiting.')
    return
  }

  // Step 3: Save to database
  console.log('\n--- Step 3: Saving to Database ---\n')

  await saveToSupabase(opportunities)

  console.log('\n=== Pipeline Complete ===')
  console.log(`Total opportunities saved: ${opportunities.length}`)
}

// Run the pipeline
main().catch(console.error)
