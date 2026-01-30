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
  unique_angle?: string
  target_audience?: string
  monetization_potential?: string
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

  const maxItems = 40

  for (const point of painPoints.slice(0, maxItems)) {
    if (quotaExhausted) break

    processed++
    console.log(`Processing ${processed}/${Math.min(painPoints.length, maxItems)}: ${point.title.slice(0, 50)}...`)

    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        // ULTRA-STRICT PROMPT
        const prompt = `You are an EXTREMELY SKEPTICAL startup analyst. Your DEFAULT answer is NO - this is NOT an opportunity.

ANALYZE THIS CONTENT:
Source: ${point.source}
Title: "${point.title}"
Content: ${point.text.slice(0, 500)}
Upvotes: ${point.score}

YOUR JOB: Decide if this is a REAL business opportunity worth building.

AUTOMATIC REJECTION (isValid MUST be false):
□ Is this a coding/programming question? ("how do I...", "what does X do", syntax help) → REJECT
□ Is this a framework bug or feature request? (Next.js issue, React problem) → REJECT
□ Is this asking for help with a one-time task? (migrate data, fix this bug) → REJECT
□ Is this too vague to build a product? (no specific pain point) → REJECT
□ Does this market have 5+ well-funded competitors? (invoicing, project management) → REJECT
□ Would the market be under 5,000 potential customers? → REJECT
□ Would this require massive scale/network effects to work? → REJECT
□ Is this actually about a PERSON/COMPANY, not a problem? → REJECT

REQUIRED FOR ACCEPTANCE (ALL must be true):
□ Is there a SPECIFIC, RECURRING problem? (not one-time)
□ Would 1,000+ people pay $10+/month for a solution?
□ Can a solo dev build an MVP in 2-4 weeks?
□ Is there a clear differentiation angle from competitors?
□ Did the source content explicitly mention wanting a tool/solution?

RESPONSE FORMAT (JSON only, no other text):
{
  "isValid": false,
  "rejectionReason": "One sentence explaining why this failed",
  "title": "Only if valid - Product Name",
  "summary": "Only if valid - 2 sentences max",
  "pain_score": 7,
  "gap_score": 7,
  "category": ["saas"],
  "keywords": ["word1", "word2"],
  "competitor": {"name": "Name", "rating": 3.5, "weakness": "Specific weakness"},
  "quote": "EXACT quote from the source content - do not paraphrase or invent",
  "unique_angle": "What specific angle makes this different",
  "target_audience": "Specific person type who needs this",
  "monetization_potential": "How this makes money"
}

CRITICAL: Default to rejection. Only accept if you are CERTAIN this is a real, buildable business opportunity. When in doubt, reject.`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // Very low for consistent, conservative judgments
          max_tokens: 500,
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
                quote: analysis.quote || point.text.slice(0, 100),
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
      if (!error) {
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
