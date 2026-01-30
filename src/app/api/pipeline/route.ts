import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// API endpoints
const HN_API = 'https://hacker-news.firebaseio.com/v0'
const DEVTO_API = 'https://dev.to/api'
const SO_API = 'https://api.stackexchange.com/2.3'

// Pain point keywords - be generous to find more opportunities
const PAIN_KEYWORDS = [
  'frustrated', 'annoying', 'wish there was', 'why is there no',
  'hate', 'terrible', 'broken', 'need a better', 'looking for',
  'alternative to', 'problem with', 'struggle', 'difficult to',
  'waste time', 'spending hours', 'ask hn', 'help me', 'how do i',
  'cant figure out', 'impossible to', 'nightmare', 'painful',
  'feature request', 'would be nice', 'suggestion', 'idea',
  'bug', 'issue', 'error', 'doesn\'t work', 'not working',
  'better way', 'easier way', 'should be', 'could be improved'
]

interface PainPoint {
  source: string
  title: string
  text: string
  url: string
  author: string
  score: number
}

// ============ HACKER NEWS ============
async function fetchHNPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  try {
    const askRes = await fetch(`${HN_API}/askstories.json`)
    const askIds: number[] = askRes.ok ? await askRes.json() : []

    for (const id of askIds.slice(0, 40)) {
      if (painPoints.length >= limit) break

      const itemRes = await fetch(`${HN_API}/item/${id}.json`)
      if (!itemRes.ok) continue
      const item = await itemRes.json()
      if (!item?.title) continue

      const text = (item.title + ' ' + (item.text || '')).toLowerCase()
      const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

      if (hasPain && item.score > 5) {
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
  } catch (e) {
    console.error('HN fetch error:', e)
  }

  return painPoints
}

// ============ GITHUB ISSUES ============
async function fetchGitHubPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Popular repos with active issue discussions
  const repos = [
    'vercel/next.js',
    'facebook/react',
    'microsoft/vscode',
    'tailwindlabs/tailwindcss',
    'prisma/prisma',
    'supabase/supabase'
  ]

  try {
    for (const repo of repos) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues?state=open&sort=comments&per_page=10`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'OpportunityRadar'
          }
        }
      )

      if (!res.ok) continue
      const issues = await res.json()

      for (const issue of issues) {
        if (painPoints.length >= limit) break
        if (issue.pull_request) continue // Skip PRs

        const text = (issue.title + ' ' + (issue.body || '')).toLowerCase()
        const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

        if (hasPain && issue.comments >= 1) {
          painPoints.push({
            source: 'github',
            title: `[${repo.split('/')[1]}] ${issue.title}`,
            text: issue.body || issue.title,
            url: issue.html_url,
            author: issue.user?.login || 'anonymous',
            score: issue.comments * 10
          })
        }
      }

      await new Promise(r => setTimeout(r, 500))
    }
  } catch (e) {
    console.error('GitHub fetch error:', e)
  }

  return painPoints
}

// ============ DEV.TO ============
async function fetchDevToPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Search terms that indicate pain points
  const searchTerms = ['struggle', 'frustrated', 'problem', 'difficult', 'wish', 'alternative']

  try {
    for (const term of searchTerms) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `${DEVTO_API}/articles?per_page=10&tag=${term}`,
        { headers: { 'User-Agent': 'OpportunityRadar' } }
      )

      if (!res.ok) continue
      const articles = await res.json()

      for (const article of articles) {
        if (painPoints.length >= limit) break

        const text = (article.title + ' ' + (article.description || '')).toLowerCase()
        const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

        if (hasPain && article.public_reactions_count > 5) {
          painPoints.push({
            source: 'devto',
            title: article.title,
            text: article.description || article.title,
            url: article.url,
            author: article.user?.username || 'anonymous',
            score: article.public_reactions_count
          })
        }
      }

      await new Promise(r => setTimeout(r, 300))
    }
  } catch (e) {
    console.error('Dev.to fetch error:', e)
  }

  return painPoints
}

// ============ STACK OVERFLOW ============
async function fetchStackOverflowPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Tags that often have pain point questions
  const tags = ['javascript', 'python', 'react', 'node.js', 'typescript', 'api']

  try {
    for (const tag of tags) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `${SO_API}/questions?order=desc&sort=votes&tagged=${tag}&site=stackoverflow&filter=withbody&pagesize=10`
      )

      if (!res.ok) continue
      const data = await res.json()

      for (const q of data.items || []) {
        if (painPoints.length >= limit) break

        const text = (q.title + ' ' + (q.body || '')).toLowerCase()
        const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

        if (hasPain && q.score > 10) {
          painPoints.push({
            source: 'stackoverflow',
            title: q.title,
            text: q.body?.replace(/<[^>]*>/g, '').slice(0, 500) || q.title,
            url: q.link,
            author: q.owner?.display_name || 'anonymous',
            score: q.score
          })
        }
      }

      await new Promise(r => setTimeout(r, 500))
    }
  } catch (e) {
    console.error('StackOverflow fetch error:', e)
  }

  return painPoints
}

// ============ PRODUCT HUNT (via discussions) ============
async function fetchProductHuntPainPoints(limit: number = 10): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Product Hunt doesn't have a free public API, so we'll use their RSS/recent products
  // and look for products that solve pain points (indicated by their taglines)
  try {
    // Fetch from Product Hunt's unofficial endpoints
    const res = await fetch('https://www.producthunt.com/frontend/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpportunityRadar'
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: 20) {
              edges {
                node {
                  name
                  tagline
                  votesCount
                  url
                  user { username }
                }
              }
            }
          }
        `
      })
    })

    if (res.ok) {
      const data = await res.json()
      const posts = data?.data?.posts?.edges || []

      for (const { node: post } of posts) {
        if (painPoints.length >= limit) break

        const text = (post.name + ' ' + post.tagline).toLowerCase()
        const hasPain = PAIN_KEYWORDS.some(kw => text.includes(kw))

        if (hasPain || post.votesCount > 100) {
          painPoints.push({
            source: 'producthunt',
            title: post.name,
            text: post.tagline,
            url: post.url,
            author: post.user?.username || 'anonymous',
            score: post.votesCount
          })
        }
      }
    }
  } catch (e) {
    console.error('ProductHunt fetch error:', e)
  }

  return painPoints
}

// ============ GEMINI ANALYSIS ============
async function analyzeWithGemini(painPoints: PainPoint[], apiKey: string) {
  // Log API key info (masked) for debugging
  const keyPreview = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} chars)` : 'NO KEY'
  console.log('Gemini API Key:', keyPreview)

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const opportunities = []
  let processed = 0
  let errors = 0
  let quotaExhausted = false
  let lastError: string | null = null

  // Process fewer items to stay within free tier limits (1500/day)
  const maxItems = 10

  for (const point of painPoints.slice(0, maxItems)) {
    if (quotaExhausted) break

    processed++
    console.log(`Processing ${processed}/${Math.min(painPoints.length, maxItems)}: ${point.title.slice(0, 40)}...`)

    // Retry logic with exponential backoff
    let retries = 0
    const maxRetries = 3

    while (retries <= maxRetries) {
      try {
        const prompt = `You are a startup idea analyst. Convert this complaint/discussion into a business opportunity.

Source: ${point.source}
Title: ${point.title}
Content: ${point.text.slice(0, 400)}

Respond with ONLY this JSON (no other text):
{"isValid":true,"title":"Short Opportunity Title","summary":"Brief description of the opportunity","pain_score":7,"gap_score":7,"category":["saas"],"keywords":["keyword1","keyword2"],"competitor":{"name":"Competitor","rating":3.5,"weakness":"Weakness"},"quote":"Key quote"}

Set isValid to true unless this is completely irrelevant (spam, off-topic). Categories: saas, developer-tools, productivity, finance, health, consumer, b2b, ai-ml, other`

        const result = await model.generateContent(prompt)
        const text = result.response.text()
        console.log('Gemini response:', text.slice(0, 200))

        const jsonMatch = text.match(/\{[\s\S]*?\}/)

        if (jsonMatch) {
          console.log('JSON match found:', jsonMatch[0].slice(0, 100))
          const analysis = JSON.parse(jsonMatch[0])
          console.log('Parsed analysis, isValid:', analysis.isValid)

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

        // Success - wait before next request to respect rate limits
        await new Promise(r => setTimeout(r, 2000))
        break // Exit retry loop on success

      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        const fullError = e instanceof Error ? JSON.stringify({ name: e.name, message: e.message, stack: e.stack?.slice(0, 500) }) : String(e)
        console.error('Gemini error details:', fullError)
        lastError = errorMsg

        // Check if quota exhausted (daily limit)
        if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          console.error('Gemini quota exhausted - stopping analysis. Full error:', fullError)
          quotaExhausted = true
          break
        }

        // Retry with backoff for other errors
        retries++
        if (retries <= maxRetries) {
          const backoffMs = Math.pow(2, retries) * 1000 // 2s, 4s, 8s
          console.log(`Retry ${retries}/${maxRetries} after ${backoffMs}ms for:`, point.title.slice(0, 30))
          await new Promise(r => setTimeout(r, backoffMs))
        } else {
          errors++
          console.error('Gemini error (max retries) for', point.title.slice(0, 30), ':', errorMsg)
        }
      }
    }
  }

  return { opportunities, quotaExhausted, processed, errors, lastError }
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

// ============ MAIN PIPELINE ============
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const results = {
    sources: {} as Record<string, number>,
    totalPainPoints: 0,
    analyzed: 0,
    added: 0,
    quotaExhausted: false,
    errors: 0,
    errorDetails: null as string | null,
    apiKeyStatus: ''
  }

  try {
    console.log('Starting multi-source pipeline...')

    // Fetch from all sources in parallel
    const [hnPoints, ghPoints, devtoPoints, soPoints, phPoints] = await Promise.all([
      fetchHNPainPoints(10),
      fetchGitHubPainPoints(10),
      fetchDevToPainPoints(10),
      fetchStackOverflowPainPoints(10),
      fetchProductHuntPainPoints(5)
    ])

    results.sources = {
      hackernews: hnPoints.length,
      github: ghPoints.length,
      devto: devtoPoints.length,
      stackoverflow: soPoints.length,
      producthunt: phPoints.length
    }

    // Combine all pain points
    const allPainPoints = [...hnPoints, ...ghPoints, ...devtoPoints, ...soPoints, ...phPoints]
    results.totalPainPoints = allPainPoints.length

    console.log(`Collected ${allPainPoints.length} pain points from ${Object.keys(results.sources).length} sources`)

    if (allPainPoints.length === 0) {
      return NextResponse.json({ message: 'No pain points found', ...results })
    }

    // Shuffle to get variety
    const shuffled = allPainPoints.sort(() => Math.random() - 0.5)

    // Log API key status
    results.apiKeyStatus = geminiKey ? `${geminiKey.slice(0, 8)}...${geminiKey.slice(-4)}` : 'MISSING'

    // Analyze with Gemini
    const geminiResult = await analyzeWithGemini(shuffled, geminiKey)
    const opportunities = geminiResult.opportunities
    results.analyzed = opportunities.length
    results.quotaExhausted = geminiResult.quotaExhausted
    results.errors = geminiResult.errors
    results.errorDetails = geminiResult.lastError

    console.log(`Analyzed ${opportunities.length} valid opportunities`)

    if (geminiResult.quotaExhausted) {
      console.log('Gemini quota exhausted - pipeline stopping early')
    }

    if (opportunities.length === 0) {
      const message = geminiResult.quotaExhausted
        ? 'Gemini API quota exhausted - try again tomorrow'
        : 'No valid opportunities'
      return NextResponse.json({ message, ...results })
    }

    // Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of opportunities) {
      // Check for duplicates by title similarity
      const titleWords = opp.title.split(' ').slice(0, 3).join(' ')
      const { data: existing } = await supabase
        .from('opportunities')
        .select('id')
        .ilike('title', `%${titleWords}%`)
        .limit(1)

      if (existing && existing.length > 0) continue

      const { error } = await supabase.from('opportunities').insert(opp)
      if (!error) results.added++
    }

    console.log(`Added ${results.added} new opportunities`)

    return NextResponse.json({
      message: 'Pipeline complete',
      ...results
    })

  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json({ error: 'Pipeline failed', details: String(error) }, { status: 500 })
  }
}
