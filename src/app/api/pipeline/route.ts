import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

// API endpoints
const HN_API = 'https://hacker-news.firebaseio.com/v0'
const SO_API = 'https://api.stackexchange.com/2.3'
const REDDIT_API = 'https://www.reddit.com'

// ============ QUALITY-FOCUSED KEYWORDS ============
// These indicate REAL business pain, not coding questions
const BUSINESS_PAIN_KEYWORDS = [
  // Workflow/productivity pain
  'waste hours', 'waste time', 'spending hours', 'takes forever',
  'tedious', 'repetitive', 'manual process', 'manually',

  // Tool/solution seeking
  'looking for a tool', 'looking for software', 'need a solution',
  'is there a tool', 'is there an app', 'is there a service',
  'alternative to', 'replacement for', 'something like',
  'wish there was', 'why is there no', 'someone should build',

  // Business/workflow frustration
  'frustrated with', 'annoying', 'painful', 'nightmare',
  'struggle with', 'difficult to manage', 'hard to track',
  'cant keep track', 'losing track', 'disorganized',

  // Specific business needs
  'automate', 'automation', 'streamline', 'simplify',
  'dashboard', 'tracking', 'monitoring', 'reporting',
  'collaboration', 'team', 'workflow', 'process',

  // Startup/indie specific
  'side project', 'indie hacker', 'solo founder', 'bootstrapped',
  'mvp', 'launch', 'validate', 'customers', 'users',
  'monetize', 'revenue', 'pricing', 'saas'
]

// Keywords that indicate this is NOT a business opportunity (filter out)
const CODING_QUESTION_PATTERNS = [
  /how (?:do|can|to) i .{0,30}(?:in|with|using) (?:javascript|python|react|node|typescript|java|c\+\+|ruby|go|rust|php)/i,
  /what (?:does|is) .{0,30}(?:mean|do|return)/i,
  /why (?:does|is|am i getting) .{0,30}(?:error|undefined|null|nan)/i,
  /(?:syntax|type|reference|runtime) error/i,
  /how to (?:install|import|require|use|call|define|declare)/i,
  /difference between .{0,30} and /i,
  /convert .{0,30} to /i,
  /parse .{0,30} (?:json|xml|html|csv)/i,
  /loop through|iterate over|foreach/i,
  /undefined is not|cannot read property|typeerror|referenceerror/i,
  /npm install|pip install|yarn add/i,
  /\bapi\b.{0,20}(?:endpoint|request|response|call)/i,
]

// Repos/sources that produce noise (framework feature requests, not products)
const BLOCKED_GITHUB_REPOS = [
  'vercel/next.js',
  'facebook/react',
  'vuejs/vue',
  'angular/angular',
  'sveltejs/svelte',
  'microsoft/typescript',
  'nodejs/node',
  'python/cpython',
]

interface PainPoint {
  source: string
  title: string
  text: string
  url: string
  author: string
  score: number
  sourceQuality: 'high' | 'medium' | 'low'
}

interface AnalysisResult {
  opportunities: Opportunity[]
  quotaExhausted: boolean
  processed: number
  rejected: number
  errors: number
  lastError: string | null
}

interface Opportunity {
  title: string
  summary: string
  pain_score: number
  trend_score: number
  gap_score: number
  overall_score: number
  category: string[]
  keywords: string[]
  sources: Array<{
    platform: string
    url: string
    quote: string
    author: string
  }>
  competitors: Array<{
    name: string
    rating: number
    weakness: string
  }>
  trend_data: Array<{ date: string; value: number }>
  unique_angle?: string
  target_audience?: string
  monetization_potential?: string
}

// ============ PRE-FILTER: Remove obvious coding questions ============
function isCodingQuestion(title: string, text: string): boolean {
  const combined = (title + ' ' + text).toLowerCase()

  // Check against coding question patterns
  for (const pattern of CODING_QUESTION_PATTERNS) {
    if (pattern.test(combined)) {
      return true
    }
  }

  // Check for common coding question starters
  const codingStarters = [
    'how do i', 'how can i', 'how to', 'what is the',
    'why does', 'why is my', 'why am i getting',
    'error when', 'exception when', 'failed to',
    'cannot', "can't", 'unable to'
  ]

  const lowerTitle = title.toLowerCase()
  for (const starter of codingStarters) {
    if (lowerTitle.startsWith(starter)) {
      // Check if it's about a workflow vs syntax
      const workflowWords = ['automate', 'workflow', 'process', 'team', 'manage', 'track', 'organize']
      if (!workflowWords.some(w => combined.includes(w))) {
        return true
      }
    }
  }

  return false
}

// ============ PRE-FILTER: Check if has business potential ============
function hasBusinessPotential(title: string, text: string): boolean {
  const combined = (title + ' ' + text).toLowerCase()
  return BUSINESS_PAIN_KEYWORDS.some(kw => combined.includes(kw))
}

// ============ HACKER NEWS (High Quality Source) ============
async function fetchHNPainPoints(limit: number = 20): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  try {
    // Fetch from Ask HN (best for pain points)
    const askRes = await fetch(`${HN_API}/askstories.json`)
    const askIds: number[] = askRes.ok ? await askRes.json() : []

    // Also fetch Show HN for competitor research
    const showRes = await fetch(`${HN_API}/showstories.json`)
    const showIds: number[] = showRes.ok ? await showRes.json() : []

    const allIds = [...askIds.slice(0, 50), ...showIds.slice(0, 30)]

    for (const id of allIds) {
      if (painPoints.length >= limit) break

      const itemRes = await fetch(`${HN_API}/item/${id}.json`)
      if (!itemRes.ok) continue
      const item = await itemRes.json()
      if (!item?.title) continue

      const title = item.title
      const text = item.text || ''

      // Skip coding questions
      if (isCodingQuestion(title, text)) continue

      // Must have business pain indicators
      if (!hasBusinessPotential(title, text)) continue

      // Higher score threshold for quality
      if (item.score >= 20) {
        painPoints.push({
          source: 'hackernews',
          title: title,
          text: text || title,
          url: `https://news.ycombinator.com/item?id=${item.id}`,
          author: item.by || 'anonymous',
          score: item.score,
          sourceQuality: item.score > 100 ? 'high' : 'medium'
        })
      }

      await new Promise(r => setTimeout(r, 100))
    }
  } catch (e) {
    console.error('HN fetch error:', e)
  }

  return painPoints
}

// ============ REDDIT (New High Quality Source) ============
async function fetchRedditPainPoints(limit: number = 20): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Subreddits with real business/startup pain points
  const subreddits = [
    'SaaS',           // SaaS founders discussing tools and problems
    'startups',       // Startup discussions
    'Entrepreneur',   // Business pain points
    'indiehackers',   // Indie hackers building products
    'smallbusiness',  // Small business owners
    'freelance',      // Freelancer pain points
    'webdev',         // Web dev workflow issues (not coding questions)
    'ProductManagement' // PM workflow issues
  ]

  try {
    for (const subreddit of subreddits) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `${REDDIT_API}/r/${subreddit}/hot.json?limit=25`,
        {
          headers: {
            'User-Agent': 'OpportunityRadar/1.0'
          }
        }
      )

      if (!res.ok) continue
      const data = await res.json()
      const posts = data?.data?.children || []

      for (const { data: post } of posts) {
        if (painPoints.length >= limit) break

        // Skip pinned/stickied posts
        if (post.stickied) continue

        const title = post.title || ''
        const text = post.selftext || ''

        // Skip coding questions
        if (isCodingQuestion(title, text)) continue

        // Must have business pain indicators
        if (!hasBusinessPotential(title, text)) continue

        // Upvote threshold
        if (post.ups >= 15) {
          painPoints.push({
            source: `reddit:${subreddit}`,
            title: title,
            text: text.slice(0, 1000) || title,
            url: `https://reddit.com${post.permalink}`,
            author: post.author || 'anonymous',
            score: post.ups,
            sourceQuality: post.ups > 100 ? 'high' : 'medium'
          })
        }
      }

      await new Promise(r => setTimeout(r, 1000)) // Reddit rate limiting
    }
  } catch (e) {
    console.error('Reddit fetch error:', e)
  }

  return painPoints
}

// ============ GITHUB (Filtered for Quality) ============
async function fetchGitHubPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // Focus on TOOL repos where users complain about workflows, not framework repos
  const repos = [
    'notion-enhancer/notion-enhancer',  // Notion power users
    'linear/linear',                     // Project management
    'calcom/cal.com',                    // Scheduling
    'posthog/posthog',                   // Analytics
    'plausible/analytics',               // Analytics
    'n8n-io/n8n',                        // Automation
    'nocodb/nocodb',                     // Database UI
    'appwrite/appwrite',                 // Backend service
    'strapi/strapi',                     // CMS
    'directus/directus'                  // Data platform
  ]

  try {
    for (const repo of repos) {
      if (painPoints.length >= limit) break

      // Skip blocked repos (frameworks)
      if (BLOCKED_GITHUB_REPOS.some(blocked => repo.includes(blocked.split('/')[1]))) {
        continue
      }

      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues?state=open&sort=comments&per_page=15&labels=enhancement,feature-request,feature`,
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
        if (issue.pull_request) continue

        const title = issue.title || ''
        const text = issue.body || ''

        // Skip coding questions / bug reports
        if (isCodingQuestion(title, text)) continue
        if (title.toLowerCase().includes('bug') || title.toLowerCase().includes('error')) continue

        // Must have business pain indicators OR be a feature request with good engagement
        const hasBusinessPain = hasBusinessPotential(title, text)
        const hasGoodEngagement = issue.comments >= 5 && issue.reactions?.['+1'] >= 3

        if (hasBusinessPain || hasGoodEngagement) {
          painPoints.push({
            source: 'github',
            title: `[${repo.split('/')[1]}] ${title}`,
            text: text.slice(0, 800) || title,
            url: issue.html_url,
            author: issue.user?.login || 'anonymous',
            score: (issue.comments || 0) * 10 + (issue.reactions?.['+1'] || 0) * 5,
            sourceQuality: issue.comments > 20 ? 'high' : 'medium'
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

// ============ STACK OVERFLOW (Heavily Filtered) ============
async function fetchStackOverflowPainPoints(limit: number = 10): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  // ONLY look for workflow/tooling questions, not syntax questions
  // Use specific tags that indicate workflow issues
  const workflowTags = [
    'automation',
    'continuous-integration',
    'deployment',
    'workflow',
    'project-management'
  ]

  try {
    for (const tag of workflowTags) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `${SO_API}/questions?order=desc&sort=votes&tagged=${tag}&site=stackoverflow&filter=withbody&pagesize=15`
      )

      if (!res.ok) continue
      const data = await res.json()

      for (const q of data.items || []) {
        if (painPoints.length >= limit) break

        const title = q.title || ''
        const body = q.body?.replace(/<[^>]*>/g, '') || ''

        // STRICT: Must be about workflow, not code
        if (isCodingQuestion(title, body)) continue

        // Very high vote threshold - only widely experienced pain
        if (q.score < 100) continue

        // Must have business/workflow indicators
        if (!hasBusinessPotential(title, body)) continue

        painPoints.push({
          source: 'stackoverflow',
          title: title,
          text: body.slice(0, 500),
          url: q.link,
          author: q.owner?.display_name || 'anonymous',
          score: q.score,
          sourceQuality: q.score > 500 ? 'high' : 'medium'
        })
      }

      await new Promise(r => setTimeout(r, 500))
    }
  } catch (e) {
    console.error('StackOverflow fetch error:', e)
  }

  return painPoints
}

// ============ INDIE HACKERS (via HN "Show HN" + keyword search) ============
async function fetchIndieHackerPainPoints(limit: number = 10): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  try {
    // Search HN for indie hacker discussions
    const searchTerms = [
      'indie hacker',
      'side project',
      'bootstrapped',
      'launched my',
      'built this'
    ]

    for (const term of searchTerms) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=20`
      )

      if (!res.ok) continue
      const data = await res.json()

      for (const hit of data.hits || []) {
        if (painPoints.length >= limit) break

        const title = hit.title || ''
        const text = hit.story_text || title

        // Look for pain points in the comments/discussion
        if (hit.points >= 30) {
          painPoints.push({
            source: 'indiehackers',
            title: title,
            text: text,
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            author: hit.author || 'anonymous',
            score: hit.points,
            sourceQuality: hit.points > 100 ? 'high' : 'medium'
          })
        }
      }

      await new Promise(r => setTimeout(r, 200))
    }
  } catch (e) {
    console.error('IndieHackers fetch error:', e)
  }

  return painPoints
}

// ============ CRITICAL AI ANALYSIS ============
async function analyzeWithGroq(painPoints: PainPoint[], apiKey: string): Promise<AnalysisResult> {
  const keyPreview = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NO KEY'
  console.log('Groq API Key:', keyPreview)

  const groq = new Groq({ apiKey })

  const opportunities: Opportunity[] = []
  let processed = 0
  let rejected = 0
  let errors = 0
  let quotaExhausted = false
  let lastError: string | null = null

  // Process all collected pain points
  const maxItems = 50

  for (const point of painPoints.slice(0, maxItems)) {
    if (quotaExhausted) break

    processed++
    console.log(`Processing ${processed}/${Math.min(painPoints.length, maxItems)}: ${point.title.slice(0, 50)}...`)

    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        // CRITICAL PROMPT - Very strict rejection criteria
        const prompt = `You are a CRITICAL startup opportunity analyst. Your job is to REJECT bad ideas and only accept genuinely buildable business opportunities.

ANALYZE THIS:
Source: ${point.source} (Quality: ${point.sourceQuality})
Title: "${point.title}"
Content: ${point.text.slice(0, 600)}
Engagement Score: ${point.score}

REJECTION CRITERIA (set isValid: false if ANY apply):
1. CODING QUESTION: Is this just asking how to do something in code? (e.g., "how to parse JSON", "remove item from array")
2. FRAMEWORK BUG: Is this a bug report or feature request for a framework that the framework maintainers should fix?
3. TOO VAGUE: Is this too generic to build a product around? (e.g., "make things easier")
4. SATURATED MARKET: Are there already 10+ well-funded competitors with no clear differentiation possible?
5. NOT A PRODUCT: Is this a one-time task, not a recurring need? (e.g., "migrate my data once")
6. TOO NICHE: Would the total addressable market be under 1,000 potential paying customers?
7. REQUIRES HUGE SCALE: Does this only work with massive network effects or data that a startup can't get?

ACCEPTANCE CRITERIA (must meet ALL):
1. REAL PAIN: Multiple people experience this pain repeatedly
2. WILLINGNESS TO PAY: Someone would pay $10-100/month to solve this
3. BUILDABLE: A solo developer could build an MVP in 2-4 weeks
4. DEFENSIBLE: Has some angle that isn't easily copied by incumbents
5. CLEAR AUDIENCE: Can identify specific people who have this problem

RESPOND WITH ONLY VALID JSON:
{
  "isValid": false,
  "rejectionReason": "Brief reason if rejected",
  "title": "Product Name (if valid)",
  "summary": "2-3 sentence business opportunity description",
  "pain_score": 7,
  "gap_score": 7,
  "category": ["saas"],
  "keywords": ["keyword1", "keyword2"],
  "competitor": {"name": "Main Competitor", "rating": 3.5, "weakness": "Specific weakness"},
  "quote": "Actual quote from the content showing pain",
  "unique_angle": "What makes this different from existing solutions",
  "target_audience": "Specific type of person/company who needs this",
  "monetization_potential": "How this could make money"
}

Be HARSH. Reject 70-80% of inputs. Only accept genuinely good opportunities.`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2, // Lower temperature for more consistent judgments
          max_tokens: 600,
        })

        const text = completion.choices[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0])

          if (analysis.isValid) {
            console.log(`✓ ACCEPTED: ${analysis.title}`)

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
              category: analysis.category || ['other'],
              keywords: analysis.keywords || [],
              sources: [{
                platform: point.source,
                url: point.url,
                quote: analysis.quote || point.text.slice(0, 150),
                author: point.author
              }],
              competitors: analysis.competitor ? [analysis.competitor] : [],
              trend_data: generateTrendData(),
              unique_angle: analysis.unique_angle,
              target_audience: analysis.target_audience,
              monetization_potential: analysis.monetization_potential
            })
          } else {
            rejected++
            console.log(`✗ REJECTED: ${point.title.slice(0, 40)}... - ${analysis.rejectionReason}`)
          }
        }

        await new Promise(r => setTimeout(r, 2000))
        break

      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        lastError = errorMsg

        if (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('quota')) {
          console.error('Groq rate limited')
          quotaExhausted = true
          break
        }

        retries++
        if (retries <= maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000))
        } else {
          errors++
          console.error('Groq error:', errorMsg.slice(0, 100))
        }
      }
    }
  }

  return { opportunities, quotaExhausted, processed, rejected, errors, lastError }
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

// ============ IMPROVED DUPLICATE DETECTION ============
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '')
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (s1 === s2) return 1
  if (s1.length < 2 || s2.length < 2) return 0

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // Simple word overlap
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3))

  const intersection = [...words1].filter(w => words2.has(w)).length
  const union = new Set([...words1, ...words2]).size

  return union > 0 ? intersection / union : 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isDuplicate(
  supabase: any,
  title: string,
  sourceUrl: string
): Promise<boolean> {
  // Check for exact URL match
  const { data: urlMatch } = await supabase
    .from('opportunities')
    .select('id, title')
    .contains('sources', [{ url: sourceUrl }])
    .limit(1)

  if (urlMatch && urlMatch.length > 0) return true

  // Check for similar titles
  const { data: recentOpps } = await supabase
    .from('opportunities')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(100)

  if (recentOpps && Array.isArray(recentOpps)) {
    for (const opp of recentOpps as Array<{ id: string; title: string }>) {
      if (calculateSimilarity(title, opp.title) > 0.6) {
        console.log(`Duplicate detected: "${title}" similar to "${opp.title}"`)
        return true
      }
    }
  }

  return false
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
  const groqKey = process.env.GROQ_API_KEY

  if (!supabaseUrl || !supabaseKey || !groqKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const results = {
    sources: {} as Record<string, number>,
    preFiltered: 0,
    totalPainPoints: 0,
    analyzed: 0,
    rejected: 0,
    duplicates: 0,
    added: 0,
    quotaExhausted: false,
    errors: 0,
    errorDetails: null as string | null,
    apiKeyStatus: '',
    qualityScore: 0
  }

  try {
    console.log('Starting QUALITY-FOCUSED pipeline...')

    // Fetch from quality sources
    const [hnPoints, redditPoints, ghPoints, soPoints, indiePoints] = await Promise.all([
      fetchHNPainPoints(15),
      fetchRedditPainPoints(15),
      fetchGitHubPainPoints(10),
      fetchStackOverflowPainPoints(5),
      fetchIndieHackerPainPoints(10)
    ])

    results.sources = {
      hackernews: hnPoints.length,
      reddit: redditPoints.length,
      github: ghPoints.length,
      stackoverflow: soPoints.length,
      indiehackers: indiePoints.length
    }

    // Combine and sort by quality
    let allPainPoints = [...hnPoints, ...redditPoints, ...ghPoints, ...soPoints, ...indiePoints]

    // Sort by source quality and score
    allPainPoints.sort((a, b) => {
      const qualityOrder = { high: 3, medium: 2, low: 1 }
      const qualityDiff = qualityOrder[b.sourceQuality] - qualityOrder[a.sourceQuality]
      if (qualityDiff !== 0) return qualityDiff
      return b.score - a.score
    })

    const preFilterCount = allPainPoints.length
    results.preFiltered = preFilterCount
    results.totalPainPoints = allPainPoints.length

    console.log(`Collected ${allPainPoints.length} pre-filtered pain points`)

    if (allPainPoints.length === 0) {
      return NextResponse.json({ message: 'No quality pain points found', ...results })
    }

    results.apiKeyStatus = groqKey ? `${groqKey.slice(0, 8)}...${groqKey.slice(-4)}` : 'MISSING'

    // Analyze with critical AI
    const groqResult = await analyzeWithGroq(allPainPoints, groqKey)

    results.analyzed = groqResult.processed
    results.rejected = groqResult.rejected
    results.quotaExhausted = groqResult.quotaExhausted
    results.errors = groqResult.errors
    results.errorDetails = groqResult.lastError

    console.log(`AI accepted ${groqResult.opportunities.length}/${groqResult.processed} opportunities`)

    if (groqResult.opportunities.length === 0) {
      return NextResponse.json({
        message: groqResult.quotaExhausted ? 'Rate limited' : 'No opportunities passed quality filter',
        ...results
      })
    }

    // Save to Supabase with duplicate detection
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of groqResult.opportunities) {
      const sourceUrl = opp.sources[0]?.url || ''

      if (await isDuplicate(supabase, opp.title, sourceUrl)) {
        results.duplicates++
        continue
      }

      const { error } = await supabase.from('opportunities').insert(opp)
      if (!error) {
        results.added++
        console.log(`✓ Added: ${opp.title}`)
      }
    }

    // Calculate quality score
    const acceptanceRate = groqResult.opportunities.length / groqResult.processed
    results.qualityScore = Math.round((1 - acceptanceRate) * 100) // Higher = more selective

    console.log(`Pipeline complete: ${results.added} new opportunities (${results.qualityScore}% selectivity)`)

    return NextResponse.json({
      message: 'Pipeline complete',
      ...results
    })

  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json({ error: 'Pipeline failed', details: String(error) }, { status: 500 })
  }
}
