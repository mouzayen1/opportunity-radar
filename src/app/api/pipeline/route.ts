import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Hacker News API
const HN_API = 'https://hacker-news.firebaseio.com/v0'

// Pain point keywords
const PAIN_KEYWORDS = [
  'frustrated', 'annoying', 'wish there was', 'why is there no',
  'hate', 'terrible', 'broken', 'need a better', 'looking for',
  'alternative to', 'problem with', 'struggle', 'difficult to',
  'waste time', 'spending hours', 'ask hn', 'tell hn'
]

interface HNItem {
  id: number
  title?: string
  text?: string
  by?: string
  score?: number
  time?: number
}

interface PainPoint {
  source: string
  title: string
  text: string
  url: string
  author: string
  score: number
}

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

async function fetchHNPainPoints(limit: number = 30): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Fetch Ask HN stories
  const askRes = await fetch(`${HN_API}/askstories.json`)
  const askIds: number[] = askRes.ok ? await askRes.json() : []

  for (const id of askIds.slice(0, 50)) {
    if (painPoints.length >= limit) break

    const item = await fetchHNItem(id)
    if (!item?.title) continue

    const text = (item.title + ' ' + (item.text || '')).toLowerCase()
    const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

    if (hasPain && item.score && item.score > 5) {
      painPoints.push({
        source: 'hackernews',
        title: item.title,
        text: item.text || item.title,
        url: `https://news.ycombinator.com/item?id=${item.id}`,
        author: item.by || 'anonymous',
        score: item.score
      })
    }

    await new Promise(r => setTimeout(r, 100))
  }

  return painPoints
}

async function analyzeWithGemini(painPoints: PainPoint[], apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const opportunities = []

  for (const point of painPoints.slice(0, 10)) {
    try {
      const prompt = `Analyze this pain point and return JSON:

Title: ${point.title}
Text: ${point.text.slice(0, 500)}
Score: ${point.score}

Return ONLY valid JSON (no markdown):
{
  "isValid": true or false,
  "title": "Clean opportunity title",
  "summary": "2-3 sentence summary",
  "pain_score": 1-10,
  "gap_score": 1-10,
  "category": ["category1", "category2"],
  "keywords": ["kw1", "kw2", "kw3"],
  "competitor": {"name": "Name", "rating": 3.5, "weakness": "Main issue"},
  "quote": "Best quote from text"
}

Categories: saas, developer-tools, productivity, finance, health, education, e-commerce, ai-ml, consumer, b2b, mobile, other
Only mark isValid:true if this is a real problem that software could solve.`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])

        if (analysis.isValid) {
          const trend_score = 5 + Math.floor(Math.random() * 4)
          const overall_score = Math.round(
            (analysis.pain_score * 0.4 + trend_score * 0.3 + analysis.gap_score * 0.3) * 10
          )

          opportunities.push({
            title: analysis.title,
            summary: analysis.summary,
            pain_score: analysis.pain_score,
            trend_score,
            gap_score: analysis.gap_score,
            overall_score,
            category: analysis.category,
            keywords: analysis.keywords,
            sources: [{
              platform: point.source,
              url: point.url,
              quote: analysis.quote || point.text.slice(0, 150),
              author: point.author
            }],
            competitors: analysis.competitor ? [analysis.competitor] : [],
            trend_data: generateTrendData()
          })
        }
      }

      await new Promise(r => setTimeout(r, 1500))
    } catch (e) {
      console.error('Gemini error:', e)
    }
  }

  return opportunities
}

function generateTrendData() {
  const data = []
  let value = 30 + Math.random() * 30
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    value = Math.min(100, Math.max(10, value + (Math.random() - 0.3) * 15))
    data.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(value)
    })
  }

  return data
}

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if no secret set
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  try {
    console.log('Starting pipeline...')

    // 1. Fetch pain points
    const painPoints = await fetchHNPainPoints(20)
    console.log(`Found ${painPoints.length} pain points`)

    if (painPoints.length === 0) {
      return NextResponse.json({ message: 'No pain points found', added: 0 })
    }

    // 2. Analyze with Gemini
    const opportunities = await analyzeWithGemini(painPoints, geminiKey)
    console.log(`Analyzed ${opportunities.length} opportunities`)

    if (opportunities.length === 0) {
      return NextResponse.json({ message: 'No valid opportunities', added: 0 })
    }

    // 3. Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    let added = 0

    for (const opp of opportunities) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('opportunities')
        .select('id')
        .ilike('title', `%${opp.title.split(' ').slice(0, 3).join(' ')}%`)
        .limit(1)

      if (existing && existing.length > 0) continue

      const { error } = await supabase.from('opportunities').insert(opp)
      if (!error) added++
    }

    console.log(`Added ${added} new opportunities`)

    return NextResponse.json({
      message: 'Pipeline complete',
      painPoints: painPoints.length,
      analyzed: opportunities.length,
      added
    })

  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 })
  }
}
