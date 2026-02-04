/**
 * Pain Collector v3.0 - FRESHNESS PRIORITY
 *
 * Two modes:
 * 1. FRESH (default): Last 7 days, low engagement threshold - catch emerging pains
 * 2. PROVEN: Last 12 months, high engagement - validated pain points
 *
 * Fresh posts are gold - competitors haven't seen them yet.
 */

export interface PainPoint {
  source: 'reddit' | 'hackernews'
  title: string
  text: string
  url: string
  author: string
  score: number
  commentCount?: number
  timestamp: number
  subreddit?: string
  searchQuery: string
  matchType: 'tool-seeking' | 'solvable-frustration'
  freshness: 'fresh' | 'proven'  // NEW: track if this is a fresh find
  ageHours: number              // NEW: how old is this post
}

// ============ SEARCH QUERIES ============

const TOOL_SEEKING_QUERIES = [
  '"looking for a tool"',
  '"looking for an app"',
  '"looking for software"',
  '"is there a tool"',
  '"is there an app"',
  '"is there software"',
  '"need a tool"',
  '"need an app"',
  '"need software"',
  '"best tool for"',
  '"best app for"',
  '"best software for"',
  '"recommend a tool"',
  '"recommend an app"',
  '"any tool that"',
  '"any app that"',
  '"what tool do you use"',
  '"what app do you use"',
  '"what software do you use"',
]

const FRUSTRATION_QUERIES = [
  '"spend hours"',
  '"spending hours"',
  '"waste hours"',
  '"wasting hours"',
  '"manually"',
  '"hate having to"',
  '"tired of doing"',
  '"there has to be a better way"',
  '"wish there was a way"',
  '"why is there no"',
  '"automate"',
  '"tedious"',
]

// ============ TARGET SUBREDDITS ============
const SUBREDDITS = [
  'smallbusiness',
  'Entrepreneur',
  'SaaS',
  'startups',
  'webdev',
  'freelance',
  'productivity',
  'software',
  'sysadmin',
  'devops',
  'marketing',
  'ecommerce',
  'realestate',
  'accounting',
  'consulting',
]

// ============ HARD REJECTION ============
const TITLE_REJECT = [
  /^show hn/i,
  /\bi built\b/i,
  /\bi made\b/i,
  /\bi created\b/i,
  /\bwe built\b/i,
  /\bwe launched\b/i,
  /\bjust launched\b/i,
  /\blaunching\b/i,
  /\bintroducing\b/i,
  /\bcheck out\b/i,
  /\bfinally built\b/i,
  /\bi'm building\b/i,
  /\bi am building\b/i,
  /\bwe're building\b/i,
  /^how i\b/i,
  /^how we\b/i,
  /\blessons learned\b/i,
  /\bwhat i learned\b/i,
  /\bi spent \$?\d/i,
  /\bmy .{5,20} made \$?\d/i,
  /\bhere'?s (?:my |an )?update\b/i,
  /\bmonths? ago i (?:posted|wrote)\b/i,
  /\bupdate:\b/i,
  /\bsolve your problem\b/i,
  /\bi (?:will|can|want to) build\b/i,
  /\blet me build\b/i,
  /\bask me anything\b/i,
  /\bAMA\b/,
  /\btips for\b/i,
  /\bguide to\b/i,
  /^\d+ (?:tips|ways|things|lessons|steps|rules)\b/i,
  /\bthat actually works\b/i,
  /\bstop (?:coding|building|chasing)\b/i,
  /\bdon't underestimate\b/i,
  /^rant:/i,
  /^unpopular opinion/i,
  /\bis it just me\b/i,
  /\bam i the only\b/i,
  /\bam i wrong\b/i,
  /\bhiring\b/i,
  /\bwho is hiring\b/i,
  /\blooking for .{0,10}(?:job|work|cofounder|developer|engineer)\b/i,
  /\bwhat got you\b/i,
  /\bmotivat/i,
  /\bwhat are you working on\b/i,
  /\bshare your\b/i,
  /\bwhat should i do\b/i,
  /\bwhat can i do\b/i,
  /\bhow do i explain\b/i,
  /\baccusing me\b/i,
  /\bmy boss\b/i,
  /\bmy professor\b/i,
  /\bmy manager\b/i,
  /\bgot fired\b/i,
  /\bgot promoted\b/i,
  /\btariff/i,
  /\bregulation/i,
  /\blawsuit/i,
  /\bhow to live\b/i,
  /\bmeaning of life\b/i,
  /\brelationship\b/i,
  /\bmy girlfriend\b/i,
  /\bmy wife\b/i,
  /\bmy husband\b/i,
  /\bmy mom\b/i,
  /\bmy dad\b/i,
  /\bmy parents\b/i,
  /\banyone else (?:feel|think|notice|experience)\b/i,
  /\bfastest you\b/i,
  /\bhow long did it take\b/i,
  /\balternative to .{3,20}$/i,
]

// ============ MUST MATCH ONE ============
const TOOL_SEEKING_TITLE = [
  /\blooking for (?:a |an )?(?:tool|app|software|solution|platform|service)\b/i,
  /\bis there (?:a |an )?(?:tool|app|software|solution|platform|service|way to)\b/i,
  /\bneed (?:a |an )?(?:tool|app|software|solution|way to)\b/i,
  /\brecommend (?:a |an )?(?:tool|app|software|solution)\b/i,
  /\bany (?:tool|app|software|service)s? (?:that|for|to)\b/i,
  /\bbest (?:tool|app|software|way) (?:for|to)\b/i,
  /\bwhat (?:tool|app|software) do you (?:use|recommend)\b/i,
  /\bwhat do you use for\b/i,
  /\bhow do you (?:handle|manage|track|automate)\b/i,
  /\bwish there was (?:a |an )?(?:tool|app|way)\b/i,
  /\bwhy is(?:n't)? there (?:no |a )(?!.*(?:manual on how to live|meaning|god|heaven))/i,
  /\bdoes anyone know (?:of )?(?:a |an )?(?:tool|app|software|way)\b/i,
  /\bcan anyone recommend\b/i,
  /\bsuggestions for\b/i,
  /\balternatives? to\b/i,
]

const SOLVABLE_FRUSTRATION_TITLE = [
  /\bspend(?:ing)? (?:\d+ )?hours? (?:on |doing |every )/i,
  /\bwaste(?:ing)? (?:\d+ )?hours?\b/i,
  /\bmanually\b/i,
  /\bhate having to\b/i,
  /\btired of (?:doing |having to )/i,
  /\boverwhelmed by (?:software|options|emails|data|tasks|invoices|orders)/i,
  /\bdrowning in (?:emails|data|spreadsheets|tasks|work)/i,
  /\btedious\b/i,
  /\btime.?consuming\b/i,
  /\bpainful (?:to|process|workflow)\b/i,
  /\bthere has to be a better way\b/i,
  /\bkilling me\b/i,
  /\bdriving me crazy\b/i,
  /\brepetitive (?:task|work|process)/i,
]

const BODY_BOOST = [
  /\bspend(?:ing)? (?:\d+ )?hours?\b/i,
  /\bwaste(?:ing)? time\b/i,
  /\bmanually\b/i,
  /\btedious\b/i,
  /\bwould pay\b/i,
  /\bbudget\b/i,
  /\btried .{1,40} but\b/i,
  /\bdoesn't work\b/i,
  /\bnothing works\b/i,
  /\bfrustrat/i,
  /\bthere has to be\b/i,
  /\bbetter way\b/i,
  /\bautomat/i,
  /\brepetitive\b/i,
  /\bevery (?:day|week|month)\b/i,
]

// ============ FILTER FUNCTION ============
interface FilterResult {
  pass: boolean
  matchType: 'tool-seeking' | 'solvable-frustration' | null
  confidence: number
  rejectReason?: string
}

function passesFilter(title: string, text: string): FilterResult {
  for (const pattern of TITLE_REJECT) {
    if (pattern.test(title)) {
      return { pass: false, matchType: null, confidence: 0, rejectReason: `Matched reject: ${pattern}` }
    }
  }

  const isToolSeeking = TOOL_SEEKING_TITLE.some(p => p.test(title))
  const isSolvableFrustration = SOLVABLE_FRUSTRATION_TITLE.some(p => p.test(title))

  if (!isToolSeeking && !isSolvableFrustration) {
    return { pass: false, matchType: null, confidence: 0, rejectReason: 'No seeking/frustration signal in title' }
  }

  let confidence = isToolSeeking ? 2 : 1
  for (const pattern of BODY_BOOST) {
    if (pattern.test(text)) confidence++
  }

  return {
    pass: true,
    matchType: isToolSeeking ? 'tool-seeking' : 'solvable-frustration',
    confidence,
  }
}

// ============ REDDIT SEARCH (FRESH MODE) ============
async function searchRedditFresh(query: string, subreddit: string): Promise<PainPoint[]> {
  // Sort by NEW, last 7 days
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=week&limit=50`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OpportunityRadar/3.0' }
    })

    if (!res.ok) {
      if (res.status === 429) {
        console.log(`  ⚠️ Rate limited on r/${subreddit}`)
        await new Promise(r => setTimeout(r, 5000))
      }
      return []
    }

    const data = await res.json()
    const posts = data?.data?.children || []
    const results: PainPoint[] = []

    for (const p of posts) {
      const d = p?.data
      if (!d) continue

      const title = d.title || ''
      const text = d.selftext || ''
      const timestamp = d.created_utc || 0
      const ageHours = (Date.now() / 1000 - timestamp) / 3600

      // FRESH: Only last 14 days (336 hours) - give more time to accumulate
      if (ageHours > 336) continue

      // VERY LOW threshold for fresh posts: 1+ upvote, any comments OK
      // Fresh posts haven't had time to accumulate engagement
      if (d.ups < 1) continue

      const filter = passesFilter(title, text)
      if (!filter.pass) continue

      results.push({
        source: 'reddit',
        title,
        text: text.slice(0, 1500),
        url: `https://reddit.com${d.permalink}`,
        author: d.author || 'anonymous',
        score: d.ups,
        commentCount: d.num_comments,
        timestamp,
        subreddit,
        searchQuery: query,
        matchType: filter.matchType!,
        freshness: 'fresh',
        ageHours: Math.round(ageHours),
      })
    }

    return results
  } catch (e) {
    console.error(`Reddit error:`, e)
    return []
  }
}

// ============ REDDIT SEARCH (PROVEN MODE) ============
async function searchRedditProven(query: string, subreddit: string): Promise<PainPoint[]> {
  // Sort by relevance (score), last year
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=year&limit=25`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OpportunityRadar/3.0' }
    })

    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 5000))
      }
      return []
    }

    const data = await res.json()
    const posts = data?.data?.children || []
    const results: PainPoint[] = []

    for (const p of posts) {
      const d = p?.data
      if (!d) continue

      const title = d.title || ''
      const text = d.selftext || ''
      const timestamp = d.created_utc || 0
      const ageHours = (Date.now() / 1000 - timestamp) / 3600

      if (ageHours > 8760) continue // 1 year

      // PROVEN: Need higher engagement
      if (d.ups < 10 || d.num_comments < 3) continue

      const filter = passesFilter(title, text)
      if (!filter.pass) continue

      results.push({
        source: 'reddit',
        title,
        text: text.slice(0, 1500),
        url: `https://reddit.com${d.permalink}`,
        author: d.author || 'anonymous',
        score: d.ups,
        commentCount: d.num_comments,
        timestamp,
        subreddit,
        searchQuery: query,
        matchType: filter.matchType!,
        freshness: 'proven',
        ageHours: Math.round(ageHours),
      })
    }

    return results
  } catch (e) {
    console.error(`Reddit error:`, e)
    return []
  }
}

// ============ HN SEARCH (FRESH MODE) ============
async function searchHNFresh(query: string): Promise<PainPoint[]> {
  // Search last 7 days
  const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=ask_hn&numericFilters=created_at_i>${weekAgo}&hitsPerPage=50`

  try {
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const results: PainPoint[] = []

    for (const hit of data.hits || []) {
      const title = hit.title || ''
      const text = hit.story_text || ''
      const timestamp = hit.created_at_i || 0
      const ageHours = (Date.now() / 1000 - timestamp) / 3600

      // FRESH: Lower threshold (3+ points for recent)
      if (hit.points < 3) continue

      const filter = passesFilter(title, text)
      if (!filter.pass) continue

      results.push({
        source: 'hackernews',
        title,
        text: text.slice(0, 1500),
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || 'anonymous',
        score: hit.points,
        commentCount: hit.num_comments,
        timestamp,
        searchQuery: query,
        matchType: filter.matchType!,
        freshness: 'fresh',
        ageHours: Math.round(ageHours),
      })
    }

    return results
  } catch (e) {
    console.error('HN error:', e)
    return []
  }
}

// ============ HN SEARCH (PROVEN MODE) ============
async function searchHNProven(query: string): Promise<PainPoint[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=ask_hn&hitsPerPage=30`

  try {
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const results: PainPoint[] = []

    for (const hit of data.hits || []) {
      const title = hit.title || ''
      const text = hit.story_text || ''
      const timestamp = hit.created_at_i || 0
      const ageHours = (Date.now() / 1000 - timestamp) / 3600

      if (ageHours > 8760) continue // 1 year

      // PROVEN: Higher threshold
      if (hit.points < 15) continue

      const filter = passesFilter(title, text)
      if (!filter.pass) continue

      results.push({
        source: 'hackernews',
        title,
        text: text.slice(0, 1500),
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || 'anonymous',
        score: hit.points,
        commentCount: hit.num_comments,
        timestamp,
        searchQuery: query,
        matchType: filter.matchType!,
        freshness: 'proven',
        ageHours: Math.round(ageHours),
      })
    }

    return results
  } catch (e) {
    console.error('HN error:', e)
    return []
  }
}

// ============ DEDUPLICATION ============
function deduplicate(points: PainPoint[]): PainPoint[] {
  const seen = new Set<string>()
  const unique: PainPoint[] = []

  for (const p of points) {
    if (seen.has(p.url)) continue

    const titleKey = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
    if (seen.has(titleKey)) continue

    seen.add(p.url)
    seen.add(titleKey)
    unique.push(p)
  }

  return unique
}

// ============ MAIN COLLECTION ============
export async function collectPainPoints(): Promise<PainPoint[]> {
  console.log('\n=== PAIN COLLECTOR v3.0 (FRESHNESS PRIORITY) ===')
  console.log('Mode: Fresh (7 days) + Proven (1 year high engagement)')
  console.log('')

  let all: PainPoint[] = []

  // ========== FRESH MODE (Priority) ==========
  console.log('[FRESH] Reddit - Last 14 days, sorted by NEW...')

  // Focused search on key subreddits to avoid rate limiting
  const freshQueries = TOOL_SEEKING_QUERIES.slice(0, 6)
  const freshSubs = SUBREDDITS.slice(0, 8)

  for (const query of freshQueries) {
    for (const sub of freshSubs) {
      const results = await searchRedditFresh(query, sub)
      if (results.length > 0) {
        console.log(`  🆕 r/${sub} "${query.slice(1, 20)}...": ${results.length} fresh`)
      }
      all.push(...results)
      await new Promise(r => setTimeout(r, 1500)) // Longer delay to avoid rate limits
    }
  }

  // Fresh frustration queries (limited)
  console.log('\n[FRESH] Reddit - Frustration queries...')
  for (const query of FRUSTRATION_QUERIES.slice(0, 4)) {
    for (const sub of freshSubs.slice(0, 5)) {
      const results = await searchRedditFresh(query, sub)
      if (results.length > 0) {
        console.log(`  🆕 r/${sub} "${query.slice(1, 20)}...": ${results.length} fresh`)
      }
      all.push(...results)
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  // Fresh HN
  console.log('\n[FRESH] HN - Last 7 days...')
  const hnQueries = [
    '"is there a tool"',
    '"looking for"',
    '"recommend"',
    '"best way to"',
    '"automate"',
    '"manually"',
    '"tedious"',
  ]
  for (const query of hnQueries) {
    const results = await searchHNFresh(query)
    if (results.length > 0) {
      console.log(`  🆕 HN "${query.slice(1, 15)}...": ${results.length} fresh`)
    }
    all.push(...results)
    await new Promise(r => setTimeout(r, 400))
  }

  // ========== PROVEN MODE (Main source) ==========
  console.log('\n[PROVEN] High-engagement posts from past year...')

  // More thorough search for proven posts
  for (const query of TOOL_SEEKING_QUERIES.slice(0, 10)) {
    for (const sub of SUBREDDITS.slice(0, 8)) {
      const results = await searchRedditProven(query, sub)
      if (results.length > 0) {
        console.log(`  ✓ r/${sub} "${query.slice(1, 20)}...": ${results.length} proven`)
      }
      all.push(...results)
      await new Promise(r => setTimeout(r, 1200))
    }
  }

  // Frustration queries for proven
  console.log('\n[PROVEN] Frustration queries...')
  for (const query of FRUSTRATION_QUERIES.slice(0, 6)) {
    for (const sub of SUBREDDITS.slice(0, 5)) {
      const results = await searchRedditProven(query, sub)
      if (results.length > 0) {
        console.log(`  ✓ r/${sub} "${query.slice(1, 20)}...": ${results.length} proven`)
      }
      all.push(...results)
      await new Promise(r => setTimeout(r, 1200))
    }
  }

  console.log('\n[PROVEN] HN high-engagement...')
  for (const query of hnQueries) {
    const results = await searchHNProven(query)
    if (results.length > 0) {
      console.log(`  ✓ HN "${query.slice(1, 15)}...": ${results.length} proven`)
    }
    all.push(...results)
    await new Promise(r => setTimeout(r, 400))
  }

  // Deduplicate
  const unique = deduplicate(all)

  // Sort: FRESH first, then by recency, then by score
  unique.sort((a, b) => {
    // Fresh posts first
    if (a.freshness !== b.freshness) {
      return a.freshness === 'fresh' ? -1 : 1
    }
    // Then by age (newer first)
    if (a.ageHours !== b.ageHours) {
      return a.ageHours - b.ageHours
    }
    // Then by score
    return b.score - a.score
  })

  // Summary
  const fresh = unique.filter(p => p.freshness === 'fresh')
  const proven = unique.filter(p => p.freshness === 'proven')
  const toolSeeking = unique.filter(p => p.matchType === 'tool-seeking').length
  const frustration = unique.filter(p => p.matchType === 'solvable-frustration').length

  console.log(`\n[Summary]`)
  console.log(`  Total unique: ${unique.length}`)
  console.log(`  🆕 Fresh (< 7 days): ${fresh.length}`)
  console.log(`  ✓ Proven (high engagement): ${proven.length}`)
  console.log(`  Tool-seeking: ${toolSeeking}`)
  console.log(`  Solvable-frustration: ${frustration}`)

  if (fresh.length > 0) {
    console.log(`\n[Fresh Posts Preview]`)
    fresh.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.ageHours}h ago] ${p.title.slice(0, 60)}...`)
    })
  }

  return unique
}
