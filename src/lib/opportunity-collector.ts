/**
 * Opportunity Collector v3.0 - LASER FOCUSED
 *
 * Only collects posts where someone is EXPLICITLY seeking a solution.
 * No more browsing hot/new posts. Only targeted searches.
 */

export interface RawOpportunity {
  source: 'reddit' | 'hackernews'
  title: string
  text: string
  url: string
  author: string
  score: number      // Upvotes
  qualityScore: number // Our quality assessment (higher = better)
  timestamp: number
  subreddit?: string
}

// ============ EXPLICIT TOOL-SEEKING QUERIES ============
// These are the ONLY queries we search for - people explicitly asking for solutions
const TOOL_SEEKING_QUERIES = [
  // Direct tool requests
  '"looking for a tool"',
  '"is there a tool"',
  '"need a tool"',
  '"looking for software"',
  '"is there software"',
  '"looking for an app"',
  '"is there an app"',

  // Gap identification
  '"wish there was"',
  '"why is there no"',
  '"why isn\'t there"',
  '"someone should build"',

  // Time/pain quantification
  '"spend hours" manually',
  '"waste time" manually',
  '"takes forever"',

  // Explicit recommendations seeking
  '"can anyone recommend"',
  '"does anyone know of"',
]

// ============ SUBREDDITS TO SEARCH ============
const TARGET_SUBREDDITS = [
  'smallbusiness',
  'Entrepreneur',
  'SaaS',
  'startups',
  'webdev',
  'freelance',
]

// ============ HARD REJECT PATTERNS (Check title) ============
const TITLE_REJECT_PATTERNS = [
  // Existing products / Success stories
  /^show hn/i,
  /i built/i,
  /i made/i,
  /i created/i,
  /we built/i,
  /we launched/i,
  /just launched/i,
  /launching/i,
  /introducing/i,
  /check out/i,
  /^how i/i,           // "How I did X" = success story
  /^how we/i,          // "How we did X" = success story
  /^from .{5,30} to/i, // "From X to Y" = transformation story
  /i've helped/i,      // Expert sharing advice
  /i've worked with/i, // Expert sharing advice
  /here's how/i,       // Advice post
  /here is how/i,
  /this is how/i,
  /lessons learned/i,
  /what i learned/i,

  // Advice/tips posts (not seeking solutions)
  /^how to .{5,50}$/i, // Generic "how to" without question mark
  /^tips for/i,
  /^guide to/i,
  /^\d+ (?:tips|ways|things|lessons|steps|rules)/i,
  /the (?:rule|secret|key|method|system) that/i,
  /that actually works/i,
  /working for (?:me|us|you)/i,

  // Meta/discussion posts
  /^why most/i,        // "Why most X fail"
  /^are we all/i,      // Discussion question
  /^does anyone wanna/i, // Vague seeking
  /most of the posts/i, // Meta about subreddit
  /getting traction/i,  // General advice
  /distribution .{5,20} broken/i,

  // Job/hiring
  /hiring/i,
  /who is hiring/i,
  /looking for (?:a job|work|cofounder|developer|engineer|founding)/i,
  /\[hiring\]/i,

  // Meta/motivation
  /^what got you to/i,
  /^what's the point/i,
  /motivat/i,
  /^\d+\/\d+ of the year/i,
  /rags.to.riches/i,

  // Rants/opinions/stories
  /^no,? you cannot/i,
  /^unpopular opinion/i,
  /^am i the only/i,
  /^rant:/i,
  /found out my/i,      // Story post
  /i lost over/i,       // Story post
  /got my first/i,      // Success story
  /i analyzed/i,        // Research/data post

  // Alternative announcements (these are existing products!)
  /alternative to .{3,20}$/i,
  /^.{3,30} alternative$/i,

  // Fake logos/social proof discussions
  /fake|logos.*social proof/i,

  // Building/validating their own product (not seeking)
  /i('m| am) (building|creating|working on|developing)/i,
  /i got tired.{5,30}so i('m| am)/i,
  /so i('m| am) building/i,

  // Research/survey questions (not seeking tool)
  /what('s| is) (the most|your biggest) frustrat/i,
  /what worked for you/i,
  /what are you working on/i,

  // Self-promotion threads
  /self.?promotion/i,
  /share your/i,
  /what are you building/i,

  // Zombie cofounder / relationship issues
  /co.?founder.{5,30}(nothing|does nothing|expect|friction)/i,

  // Asking about payment strategy (not tool)
  /is it necessary to aim for/i,

  // Experience/advice seeking (not tool)
  /those of you who/i,
  /what('s| is) the most frustrating/i,
  /anyone else\??$/i,

  // Built something (not seeking)
  /built a .{5,30} after/i,
  /finally built/i,

  // Validation questions
  /is this a good sign/i,
  /is this worth/i,

  // "I got tired so I'm building" pattern
  /i got tired.{5,40}so/i,

  // "Thinking of building" pattern (not seeking)
  /thinking of building/i,
]

// ============ TITLE MUST HAVE (At least one - checked IN TITLE ONLY) ============
// These are STRICT - the title itself must indicate someone seeking a solution
const TITLE_MUST_HAVE_SIGNALS = [
  /looking for (?:a |an )?(?:tool|app|software|solution|way|something)/i,
  /is there (?:a |an )?(?:tool|app|software|service|way|anything)/i,
  /need (?:a |an )?(?:tool|app|software|solution|way)/i,
  /(?:can |does )anyone (?:recommend|know of|suggest)/i,
  /any(?:one)? recommend/i,
  /recommend(?:ation)?s? (?:for|please)/i,
  /wish there was/i,
  /why is(?:n't)? there no/i,
  /what (?:do you|are you) using for/i,
  /what(?:'s| is) (?:a |the )best (?:tool|app|software|way)/i,
  /how do (?:you|i) (?:handle|manage|track|deal with)/i,
  /how to stop/i, // "how to stop X" = seeking solution
  /overwhelmed by/i,
  /drowning in/i,
  /struggling with/i,
  /\?$/, // Ends with question mark (asking something)
]

// ============ BODY BOOST SIGNALS (Nice to have, not required) ============
const BODY_BOOST_SIGNALS = [
  /spend(?:ing)? (?:\d+ )?hours/i,
  /waste(?:ing)? (?:\d+ )?hours/i,
  /manually/i,
  /takes (?:forever|too long|hours)/i,
  /there has to be a better way/i,
  /would pay for/i,
  /budget/i,
]

/**
 * Pre-filter: Is this worth sending to AI?
 * STRICT: Title must contain seeking signal, not just body
 */
function passesPreFilter(title: string, text: string): { pass: boolean; reason?: string; score?: number } {
  // Check title reject patterns FIRST
  for (const pattern of TITLE_REJECT_PATTERNS) {
    if (pattern.test(title)) {
      return { pass: false, reason: `Reject: ${pattern.source.slice(0, 25)}` }
    }
  }

  // TITLE must have at least one seeking signal
  const hasTitleSignal = TITLE_MUST_HAVE_SIGNALS.some(pattern => pattern.test(title))
  if (!hasTitleSignal) {
    return { pass: false, reason: 'Title has no seeking signal' }
  }

  // Calculate quality score based on body signals
  let score = 1
  for (const pattern of BODY_BOOST_SIGNALS) {
    if (pattern.test(text)) score++
  }

  return { pass: true, score }
}

/**
 * Search Reddit for explicit tool-seeking posts
 */
async function searchReddit(query: string, subreddit: string): Promise<RawOpportunity[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=year&limit=25`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OpportunityRadar/3.0' },
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`  [Reddit] Rate limited on r/${subreddit}`)
        await new Promise(r => setTimeout(r, 5000))
      }
      return []
    }

    const data = await response.json()
    const posts = data?.data?.children || []
    const opportunities: RawOpportunity[] = []

    for (const post of posts) {
      const d = post?.data
      if (!d) continue

      const title = d.title || ''
      const text = d.selftext || ''
      const timestamp = d.created_utc || 0

      // Skip if too old (> 12 months)
      const ageMonths = (Date.now() / 1000 - timestamp) / (30 * 24 * 60 * 60)
      if (ageMonths > 12) continue

      // Skip low engagement
      if (d.ups < 5 || d.num_comments < 2) continue

      // Pre-filter
      const filter = passesPreFilter(title, text)
      if (!filter.pass) {
        // Only log if it's a borderline case (has some engagement)
        if (d.ups > 15) {
          console.log(`  ✗ r/${subreddit}: ${filter.reason} - "${title.slice(0, 40)}"`)
        }
        continue
      }

      console.log(`  ✓ r/${subreddit}: "${title.slice(0, 50)}" (${d.ups} pts, q:${filter.score})`)
      opportunities.push({
        source: 'reddit',
        title,
        text: text.slice(0, 1000),
        url: `https://reddit.com${d.permalink}`,
        author: d.author || 'anonymous',
        score: d.ups,
        qualityScore: filter.score || 1,
        timestamp,
        subreddit,
      })
    }

    return opportunities
  } catch (e) {
    console.error(`  [Reddit] Error searching r/${subreddit}:`, e)
    return []
  }
}

/**
 * Search HN via Algolia for explicit tool-seeking posts
 */
async function searchHN(query: string): Promise<RawOpportunity[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=ask_hn&hitsPerPage=30`

  try {
    const response = await fetch(url)
    if (!response.ok) return []

    const data = await response.json()
    const opportunities: RawOpportunity[] = []

    for (const hit of data.hits || []) {
      const title = hit.title || ''
      const text = hit.story_text || ''
      const timestamp = hit.created_at_i || 0

      // Skip if too old (> 12 months)
      const ageMonths = (Date.now() / 1000 - timestamp) / (30 * 24 * 60 * 60)
      if (ageMonths > 12) continue

      // Skip low engagement
      if (hit.points < 10) continue

      // Pre-filter
      const filter = passesPreFilter(title, text)
      if (!filter.pass) {
        if (hit.points > 20) {
          console.log(`  ✗ HN: ${filter.reason} - "${title.slice(0, 40)}"`)
        }
        continue
      }

      console.log(`  ✓ HN: "${title.slice(0, 50)}" (${hit.points} pts, q:${filter.score})`)
      opportunities.push({
        source: 'hackernews',
        title,
        text: text.slice(0, 1000),
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || 'anonymous',
        score: hit.points,
        qualityScore: filter.score || 1,
        timestamp,
      })
    }

    return opportunities
  } catch (e) {
    console.error('  [HN] Search error:', e)
    return []
  }
}

/**
 * Deduplicate by URL and similar titles
 */
function deduplicate(opportunities: RawOpportunity[]): RawOpportunity[] {
  const seen = new Set<string>()
  const unique: RawOpportunity[] = []

  for (const opp of opportunities) {
    if (seen.has(opp.url)) continue

    // Simple title hash
    const titleHash = opp.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
    if (seen.has(titleHash)) continue

    seen.add(opp.url)
    seen.add(titleHash)
    unique.push(opp)
  }

  return unique
}

/**
 * Main collection function - FOCUSED SEARCH ONLY
 */
export async function collectOpportunities(): Promise<RawOpportunity[]> {
  console.log('\n=== OPPORTUNITY COLLECTOR v3.0 ===')
  console.log('Mode: Targeted search only (no hot/new browsing)')
  console.log(`Queries: ${TOOL_SEEKING_QUERIES.length}`)
  console.log(`Subreddits: ${TARGET_SUBREDDITS.join(', ')}`)
  console.log('')

  let allOpportunities: RawOpportunity[] = []
  let totalSearches = 0
  let rateLimited = false

  // Search Reddit
  console.log('[Reddit] Starting targeted searches...')
  for (const query of TOOL_SEEKING_QUERIES) {
    if (rateLimited) break

    for (const subreddit of TARGET_SUBREDDITS.slice(0, 4)) { // Top 4 subreddits
      totalSearches++
      console.log(`  Searching r/${subreddit}: ${query}`)

      const results = await searchReddit(query, subreddit)
      allOpportunities.push(...results)

      // Rate limit protection
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  // Search HN
  console.log('\n[HN] Starting targeted searches...')
  for (const query of TOOL_SEEKING_QUERIES.slice(0, 8)) { // First 8 queries
    totalSearches++
    console.log(`  Searching HN: ${query}`)

    const results = await searchHN(query)
    allOpportunities.push(...results)

    await new Promise(r => setTimeout(r, 500))
  }

  // Deduplicate
  const unique = deduplicate(allOpportunities)

  // Sort by quality score first, then upvotes
  unique.sort((a, b) => {
    if (b.qualityScore !== a.qualityScore) {
      return b.qualityScore - a.qualityScore
    }
    return b.score - a.score
  })

  console.log(`\n[Collector] Results:`)
  console.log(`  Total searches: ${totalSearches}`)
  console.log(`  Raw results: ${allOpportunities.length}`)
  console.log(`  After dedupe: ${unique.length}`)

  return unique
}
