import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

// API endpoints
const HN_API = 'https://hacker-news.firebaseio.com/v0'

// ============ STRICT BUSINESS PAIN INDICATORS ============
// Only accept content that EXPLICITLY mentions wanting a tool/solution
const EXPLICIT_SOLUTION_SEEKING = [
  'looking for a tool', 'looking for software', 'looking for an app',
  'need a tool', 'need software', 'need an app', 'need a solution',
  'is there a tool', 'is there an app', 'is there software',
  'does anyone know of', 'can anyone recommend', 'recommendations for',
  'alternative to', 'replacement for', 'something like', 'similar to',
  'wish there was', 'why is there no', 'someone should build',
  'would pay for', 'shut up and take my money', 'take my money',
  'i would use', 'we would use', 'our team needs',
  'built a tool', 'built an app', 'building a', 'working on a',
  'launched', 'shipping', 'side project', 'show hn', 'ask hn'
]

// HARD REJECT: If ANY of these patterns match, it's NOT an opportunity
const HARD_REJECT_PATTERNS = [
  // Coding syntax questions
  /how (?:do|can|to) (?:i|you|we) .{0,50}(?:in|with|using) (?:javascript|python|react|node|typescript|java|c\+\+|ruby|go|rust|php|css|html|sql)/i,
  /what (?:does|is|are) .{0,30}(?:mean|do|return|work)/i,
  /why (?:does|is|am i getting|do i get) .{0,30}(?:error|undefined|null|nan|exception)/i,
  /(?:syntax|type|reference|runtime|compile) error/i,
  /how to (?:install|import|require|use|call|define|declare|implement|create|make|write|read|parse|convert|loop|iterate)/i,
  /difference between .{0,30} and /i,
  /convert .{0,30} to /i,
  /parse .{0,30} (?:json|xml|html|csv|string|int|float)/i,
  /loop through|iterate over|for ?each|map over/i,
  /undefined is not|cannot read property|typeerror|referenceerror|syntaxerror/i,
  /npm install|pip install|yarn add|cargo add|gem install/i,
  /\bapi\b.{0,20}(?:endpoint|request|response|call|fetch)/i,
  /merge .{0,20}(?:dict|array|object|list|hash)/i,
  /remove .{0,20}(?:item|element|property|key) from/i,
  /check if .{0,20}(?:file|element|variable|object) (?:exists|is)/i,
  /redirect .{0,20}(?:to|from|user|page)/i,
  /get .{0,20}(?:value|element|property|key|item) from/i,
  /set .{0,20}(?:value|property|attribute)/i,
  /add .{0,20}(?:item|element|class|event) to/i,

  // Framework-specific bugs (these are for the framework maintainers, not products)
  /next\.?js .{0,30}(?:bug|issue|error|problem|not working)/i,
  /react .{0,30}(?:bug|issue|error|problem|hooks?)/i,
  /vue .{0,30}(?:bug|issue|error|problem)/i,
  /angular .{0,30}(?:bug|issue|error|problem)/i,
  /typescript .{0,30}(?:bug|issue|error|problem)/i,
  /webpack .{0,30}(?:bug|issue|error|config)/i,
  /vite .{0,30}(?:bug|issue|error|config)/i,
  /(?:app router|pages router|server component|client component).{0,30}(?:issue|bug|error|not working)/i,
  /(?:framer motion|css module|tailwind).{0,30}(?:issue|bug|error|not working)/i,
  /breakpoint.{0,20}(?:not|doesn't|won't) (?:work|land|hit)/i,
  /prerender.{0,20}(?:error|fail|issue)/i,
  /hydration .{0,20}(?:error|mismatch|fail)/i,

  // Too basic/generic
  /^how do i/i,
  /^what is the/i,
  /^why does/i,
  /^can i/i,
  /^is it possible to/i
]

// Titles that are clearly coding utilities, not business products
const CODING_UTILITY_NAMES = [
  /dict.?merge/i, /array.?merge/i, /object.?merge/i,
  /file.?check/i, /path.?check/i, /exist.?check/i,
  /page.?redirect/i, /url.?redirect/i,
  /visibility.?manager/i, /element.?manager/i,
  /property.?remov/i, /key.?remov/i,
  /json.?pars/i, /xml.?pars/i, /csv.?pars/i,
  /string.?format/i, /date.?format/i,
  /async.?helper/i, /promise.?helper/i,
  /hook.?manager/i, /state.?manager/i,
  /css.?resolv/i, /style.?resolv/i,
  /^[A-Z][a-z]+(?:Merge|Check|Parse|Format|Helper|Manager|Resolver|Handler|Wrapper|Util)$/
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

interface Opportunity {
  title: string
  summary: string
  pain_score: number
  trend_score: number
  gap_score: number
  overall_score: number
  category: string[]
  keywords: string[]
  sources: Array<{ platform: string; url: string; quote: string; author: string }>
  competitors: Array<{ name: string; rating: number; weakness: string }>
  trend_data: Array<{ date: string; value: number }>
  // Rich details for actionable insights
  problem?: string           // Clear problem statement (1-2 sentences)
  solution?: string          // What the product does (1-2 sentences)
  target_audience?: string   // Specific user persona
  market_size?: string       // Rough estimate (e.g., "50K-100K developers")
  monetization?: string      // Pricing model (e.g., "$15/mo SaaS")
  mvp_features?: string[]    // 3-4 key features to build first
  unique_angle?: string      // What makes this different
}

// ============ STRICT PRE-FILTER ============
function isDefinitelyNotAnOpportunity(title: string, text: string): boolean {
  const combined = (title + ' ' + text).toLowerCase()
  const titleLower = title.toLowerCase()

  // Check hard reject patterns
  for (const pattern of HARD_REJECT_PATTERNS) {
    if (pattern.test(combined)) {
      console.log(`  ✗ HARD REJECT (pattern): ${title.slice(0, 40)}`)
      return true
    }
  }

  // Check if title looks like a coding utility name
  for (const pattern of CODING_UTILITY_NAMES) {
    if (pattern.test(title)) {
      console.log(`  ✗ HARD REJECT (utility name): ${title.slice(0, 40)}`)
      return true
    }
  }

  // If title is very short (1-3 words) and doesn't contain business words, reject
  const words = title.split(/\s+/)
  if (words.length <= 3) {
    const businessWords = ['saas', 'platform', 'service', 'business', 'startup', 'company', 'revenue', 'customer', 'client', 'market']
    if (!businessWords.some(bw => titleLower.includes(bw))) {
      // Could be a utility name - check if it contains technical terms
      const techTerms = ['api', 'css', 'html', 'json', 'sql', 'http', 'dom', 'xml', 'cli', 'sdk', 'jwt', 'oauth']
      if (techTerms.some(tt => titleLower.includes(tt))) {
        console.log(`  ✗ HARD REJECT (short technical title): ${title}`)
        return true
      }
    }
  }

  return false
}

// ============ CHECK FOR EXPLICIT SOLUTION SEEKING ============
function isExplicitlySolutionSeeking(title: string, text: string): boolean {
  const combined = (title + ' ' + text).toLowerCase()
  return EXPLICIT_SOLUTION_SEEKING.some(phrase => combined.includes(phrase))
}

// ============ HACKER NEWS (Primary Source) ============
async function fetchHNPainPoints(limit: number = 25): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  try {
    // Ask HN is the best source - people explicitly asking for solutions
    const askRes = await fetch(`${HN_API}/askstories.json`)
    const askIds: number[] = askRes.ok ? await askRes.json() : []

    // Show HN shows what people are building (validates demand exists)
    const showRes = await fetch(`${HN_API}/showstories.json`)
    const showIds: number[] = showRes.ok ? await showRes.json() : []

    const allIds = [...askIds.slice(0, 60), ...showIds.slice(0, 40)]

    for (const id of allIds) {
      if (painPoints.length >= limit) break

      const itemRes = await fetch(`${HN_API}/item/${id}.json`)
      if (!itemRes.ok) continue
      const item = await itemRes.json()
      if (!item?.title) continue

      const title = item.title
      const text = item.text || ''

      // STRICT: Hard reject coding questions
      if (isDefinitelyNotAnOpportunity(title, text)) continue

      // STRICT: Must explicitly seek a solution
      if (!isExplicitlySolutionSeeking(title, text)) {
        // Exception: Show HN posts demonstrate demand
        if (!title.toLowerCase().includes('show hn')) continue
      }

      // Higher score threshold
      if (item.score >= 15) {
        painPoints.push({
          source: 'hackernews',
          title: title,
          text: text || title,
          url: `https://news.ycombinator.com/item?id=${item.id}`,
          author: item.by || 'anonymous',
          score: item.score,
          sourceQuality: item.score > 100 ? 'high' : item.score > 50 ? 'medium' : 'low'
        })
      }

      await new Promise(r => setTimeout(r, 100))
    }
  } catch (e) {
    console.error('HN fetch error:', e)
  }

  return painPoints
}

// ============ INDIE HACKER SEARCH (Secondary Source) ============
async function fetchIndieHackerPainPoints(limit: number = 15): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  try {
    // Search for explicit business/product discussions
    const searchTerms = [
      'looking for a tool',
      'need a solution for',
      'wish there was',
      'would pay for',
      'built a saas',
      'launched my startup',
      'side project revenue'
    ]

    for (const term of searchTerms) {
      if (painPoints.length >= limit) break

      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=15`
      )

      if (!res.ok) continue
      const data = await res.json()

      for (const hit of data.hits || []) {
        if (painPoints.length >= limit) break

        const title = hit.title || ''
        const text = hit.story_text || ''

        // STRICT: Hard reject
        if (isDefinitelyNotAnOpportunity(title, text)) continue

        if (hit.points >= 20) {
          painPoints.push({
            source: 'indiehackers',
            title: title,
            text: text || title,
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

// ============ WITHIN-BATCH DUPLICATE CHECK ============
function removeBatchDuplicates(painPoints: PainPoint[]): PainPoint[] {
  const seen = new Set<string>()
  const unique: PainPoint[] = []

  for (const point of painPoints) {
    // Normalize title for comparison
    const normalized = point.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .sort()
      .join(' ')

    // Check for similar existing
    let isDupe = false
    for (const seenTitle of seen) {
      const similarity = calculateTitleSimilarity(normalized, seenTitle)
      if (similarity > 0.5) { // 50% word overlap = duplicate
        console.log(`  ✗ Batch duplicate: "${point.title.slice(0, 30)}" ~ "${seenTitle.slice(0, 30)}"`)
        isDupe = true
        break
      }
    }

    if (!isDupe) {
      seen.add(normalized)
      unique.push(point)
    }
  }

  return unique
}

function calculateTitleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '))
  const wordsB = new Set(b.split(' '))
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return union > 0 ? intersection / union : 0
}

// ============ ULTRA-STRICT AI ANALYSIS ============
async function analyzeWithGroq(painPoints: PainPoint[], apiKey: string) {
  const groq = new Groq({ apiKey })

  const opportunities: Opportunity[] = []
  let processed = 0
  let rejected = 0
  let errors = 0
  let quotaExhausted = false
  let lastError: string | null = null

  const maxItems = 30 // Stay within Groq daily limits

  for (const point of painPoints.slice(0, maxItems)) {
    if (quotaExhausted) break

    processed++
    console.log(`Processing ${processed}/${Math.min(painPoints.length, maxItems)}: ${point.title.slice(0, 50)}...`)

    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        // RICH ANALYSIS PROMPT - Generate actionable opportunity details
        const prompt = `You are a startup analyst. Evaluate if this is a REAL business opportunity and provide actionable details.

CONTENT TO ANALYZE:
Source: ${point.source} (${point.score} upvotes)
Title: "${point.title}"
Content: ${point.text.slice(0, 600)}

REJECT (isValid: false) if:
- Coding question ("how do I...", syntax, debugging)
- Framework bug report (Next.js, React issues)
- One-time task (migration, deployment help)
- News/opinion piece
- Direct competition with giants (Slack, Notion core features)

ACCEPT if there's a recurring pain point an indie dev could solve profitably.

RESPONSE FORMAT (JSON only):
{
  "isValid": true/false,
  "rejectionReason": "Brief reason if rejected",

  "title": "Product Name (3-5 words)",
  "problem": "What specific problem exists? Who has it? (2 sentences max)",
  "solution": "What would this product do? (2 sentences max)",

  "target_audience": "Specific persona (e.g., 'Solo developers shipping side projects')",
  "market_size": "Rough estimate (e.g., '50K-200K potential users')",
  "monetization": "Pricing model (e.g., 'Freemium, $12/mo Pro tier')",

  "mvp_features": ["Feature 1", "Feature 2", "Feature 3"],
  "unique_angle": "What differentiates this from alternatives? (1 sentence)",

  "competitor": {"name": "Main competitor", "weakness": "Their specific gap"},
  "evidence": "Key quote or signal from the source proving demand",

  "pain_score": 1-10,
  "gap_score": 1-10,
  "category": ["saas", "devtool", "productivity", "consumer"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Keep all text CONCISE - this should fit on a single card view.`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile', // Quality model for accurate judgments
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3, // Balanced - consistent but allows nuanced judgments
          max_tokens: 400,
        })

        const text = completion.choices[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0])

          if (analysis.isValid === true) {
            console.log(`  ✓ ACCEPTED: ${analysis.title}`)

            // Conservative scoring
            const trend_score = 5 + Math.floor(Math.random() * 3) // 5-7 range
            const overall_score = Math.round(
              (analysis.pain_score * 0.5 + trend_score * 0.2 + analysis.gap_score * 0.3) * 10
            )

            // Build rich opportunity with actionable details
            opportunities.push({
              title: analysis.title,
              summary: analysis.problem || analysis.summary || '', // Use problem as summary
              pain_score: analysis.pain_score,
              trend_score,
              gap_score: analysis.gap_score,
              overall_score,
              category: analysis.category || ['other'],
              keywords: analysis.keywords || [],
              sources: [{
                platform: point.source,
                url: point.url,
                quote: analysis.evidence || point.text.slice(0, 150),
                author: point.author
              }],
              competitors: analysis.competitor ? [analysis.competitor] : [],
              trend_data: generateTrendData(),
              // Rich details for actionable insights
              problem: analysis.problem,
              solution: analysis.solution,
              target_audience: analysis.target_audience,
              market_size: analysis.market_size,
              monetization: analysis.monetization,
              mvp_features: analysis.mvp_features,
              unique_angle: analysis.unique_angle
            })
          } else {
            rejected++
            console.log(`  ✗ REJECTED: ${analysis.rejectionReason || 'No reason given'}`)
          }
        }

        await new Promise(r => setTimeout(r, 2000))
        break

      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        lastError = errorMsg

        if (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('quota')) {
          quotaExhausted = true
          break
        }

        retries++
        if (retries <= maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000))
        } else {
          errors++
        }
      }
    }
  }

  return { opportunities, quotaExhausted, processed, rejected, errors, lastError }
}

function generateTrendData() {
  // Placeholder - ideally this would use real Google Trends data
  const data = []
  let value = 40 + Math.random() * 20
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    value = Math.min(100, Math.max(20, value + (Math.random() - 0.4) * 10))
    data.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(value)
    })
  }

  return data
}

// ============ IMPROVED DUPLICATE DETECTION (0.5 threshold) ============
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isDuplicateInDB(supabase: any, title: string, sourceUrl: string): Promise<boolean> {
  // Check for exact URL match
  const { data: urlMatch } = await supabase
    .from('opportunities')
    .select('id')
    .contains('sources', [{ url: sourceUrl }])
    .limit(1)

  if (urlMatch && urlMatch.length > 0) {
    console.log(`  ✗ Duplicate (exact URL match)`)
    return true
  }

  // Check for similar titles (lowered threshold to 0.5)
  const { data: recentOpps } = await supabase
    .from('opportunities')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(200)

  if (recentOpps && Array.isArray(recentOpps)) {
    const titleWords = new Set(
      title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
    )

    for (const opp of recentOpps as Array<{ id: string; title: string }>) {
      const oppWords = new Set(
        opp.title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2)
      )

      const intersection = [...titleWords].filter(w => oppWords.has(w)).length
      const union = new Set([...titleWords, ...oppWords]).size
      const similarity = union > 0 ? intersection / union : 0

      if (similarity > 0.5) { // Lowered from 0.6 to 0.5
        console.log(`  ✗ Duplicate: "${title.slice(0, 30)}" ~ "${opp.title.slice(0, 30)}" (${Math.round(similarity * 100)}%)`)
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
    collected: 0,
    afterHardReject: 0,
    afterBatchDedupe: 0,
    analyzed: 0,
    aiAccepted: 0,
    aiRejected: 0,
    dbDuplicates: 0,
    added: 0,
    quotaExhausted: false,
    errors: 0,
    errorDetails: null as string | null,
    acceptanceRate: '',
    apiKeyStatus: ''
  }

  try {
    console.log('=== STRICT QUALITY PIPELINE ===')
    console.log('Sources: HackerNews + IndieHackers only (no StackOverflow/GitHub)')

    // Fetch from quality sources only
    const [hnPoints, indiePoints] = await Promise.all([
      fetchHNPainPoints(20),
      fetchIndieHackerPainPoints(15)
    ])

    results.sources = {
      hackernews: hnPoints.length,
      indiehackers: indiePoints.length
    }

    let allPainPoints = [...hnPoints, ...indiePoints]
    results.collected = allPainPoints.length

    console.log(`\nCollected: ${allPainPoints.length} items`)

    // Remove batch duplicates BEFORE AI analysis
    allPainPoints = removeBatchDuplicates(allPainPoints)
    results.afterBatchDedupe = allPainPoints.length

    console.log(`After batch dedupe: ${allPainPoints.length} items`)

    if (allPainPoints.length === 0) {
      return NextResponse.json({ message: 'No quality pain points found', ...results })
    }

    // Sort by score (highest first)
    allPainPoints.sort((a, b) => b.score - a.score)

    results.apiKeyStatus = groqKey ? `${groqKey.slice(0, 6)}...` : 'MISSING'

    // Analyze with ultra-strict AI
    const groqResult = await analyzeWithGroq(allPainPoints, groqKey)

    results.analyzed = groqResult.processed
    results.aiAccepted = groqResult.opportunities.length
    results.aiRejected = groqResult.rejected
    results.quotaExhausted = groqResult.quotaExhausted
    results.errors = groqResult.errors
    results.errorDetails = groqResult.lastError

    const acceptanceRate = groqResult.processed > 0
      ? Math.round((groqResult.opportunities.length / groqResult.processed) * 100)
      : 0
    results.acceptanceRate = `${acceptanceRate}%`

    console.log(`\nAI Results: ${groqResult.opportunities.length}/${groqResult.processed} accepted (${acceptanceRate}%)`)

    if (groqResult.opportunities.length === 0) {
      return NextResponse.json({
        message: groqResult.quotaExhausted ? 'Rate limited' : 'No opportunities passed strict filter',
        ...results
      })
    }

    // Save to Supabase with duplicate detection
    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const opp of groqResult.opportunities) {
      const sourceUrl = opp.sources[0]?.url || ''

      if (await isDuplicateInDB(supabase, opp.title, sourceUrl)) {
        results.dbDuplicates++
        continue
      }

      const { error } = await supabase.from('opportunities').insert(opp)
      if (error) {
        console.error(`  ✗ DB ERROR saving "${opp.title}":`, error.message)
        results.errors++
        results.errorDetails = `DB: ${error.message}`
      } else {
        results.added++
        console.log(`  ✓ SAVED: ${opp.title}`)
      }
    }

    console.log(`\n=== PIPELINE COMPLETE ===`)
    console.log(`Added: ${results.added} | Duplicates: ${results.dbDuplicates} | AI Acceptance: ${results.acceptanceRate}`)

    return NextResponse.json({
      message: 'Pipeline complete',
      ...results
    })

  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json({ error: 'Pipeline failed', details: String(error) }, { status: 500 })
  }
}
