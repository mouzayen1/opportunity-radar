/**
 * Reddit Collector for OpportunityRadar
 *
 * Uses public JSON endpoints (no API key needed!)
 * Finds UNSOLVED problems, not trending products
 *
 * Inspired by trend-radar approach, adapted for pain point discovery
 */

import { analyzeOpportunityPotential, hasProblemSignal, extractPainPoint } from './pain-filters'

export interface RedditPainPoint {
  source: 'reddit'
  subreddit: string
  title: string
  text: string
  url: string
  author: string
  score: number
  numComments: number
  upvoteRatio: number
  createdUtc: number
  ageHours: number
  painSignal: string | null
  sourceQuality: 'high' | 'medium' | 'low'
}

// Subreddits focused on business/product pain points
const SUBREDDITS = [
  'SaaS',
  'Entrepreneur',
  'startups',
  'smallbusiness',
  'webdev',
  'indiehackers',
  'microsaas',
  'EntrepreneurRideAlong',
]

// Pain-focused search queries
const PAIN_QUERIES = [
  'looking for a tool',
  'is there a',
  'frustrated',
  'wish there was',
  'need help with',
  'alternative to',
  'struggling with',
  'why is there no',
  'anyone recommend',
  'waste time',
]

// Thresholds - lower than trend-radar since problems get less engagement than announcements
const MIN_UPVOTES = 5
const MIN_COMMENTS = 2
const MIN_UPVOTE_RATIO = 0.50
const MAX_POST_AGE_DAYS = 30

/**
 * Fetch posts from a subreddit using public JSON endpoint
 */
async function fetchSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top' = 'hot'): Promise<RedditPainPoint[]> {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=50`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpportunityRadar/1.0 (Pain Point Discovery Tool)',
      },
    })

    if (response.status === 429) {
      console.log(`  [Reddit] Rate limited on r/${subreddit}, skipping...`)
      await new Promise(r => setTimeout(r, 5000))
      return []
    }

    if (!response.ok) {
      console.log(`  [Reddit] Error ${response.status} on r/${subreddit}`)
      return []
    }

    const data = await response.json()
    const posts = data?.data?.children || []

    return processPosts(posts, subreddit)
  } catch (error) {
    console.error(`  [Reddit] Fetch error for r/${subreddit}:`, error)
    return []
  }
}

/**
 * Search a subreddit for specific pain-related queries
 */
async function searchSubreddit(subreddit: string, query: string): Promise<RedditPainPoint[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=month&limit=25`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpportunityRadar/1.0 (Pain Point Discovery Tool)',
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const posts = data?.data?.children || []

    return processPosts(posts, subreddit)
  } catch (error) {
    return []
  }
}

/**
 * Process raw Reddit posts into pain points
 */
function processPosts(posts: any[], subreddit: string): RedditPainPoint[] {
  const painPoints: RedditPainPoint[] = []
  const now = Date.now() / 1000

  for (const post of posts) {
    const data = post?.data
    if (!data) continue

    const title = data.title || ''
    const selftext = data.selftext || ''
    const combined = `${title} ${selftext}`

    // Calculate age
    const createdUtc = data.created_utc || 0
    const ageHours = (now - createdUtc) / 3600
    const ageDays = ageHours / 24

    // === FILTERING ===

    // Skip if too old
    if (ageDays > MAX_POST_AGE_DAYS) continue

    // Skip if low engagement (but be lenient - problems often get less attention)
    if (data.ups < MIN_UPVOTES) continue
    if (data.num_comments < MIN_COMMENTS) continue
    if ((data.upvote_ratio || 0) < MIN_UPVOTE_RATIO) continue

    // Analyze if this is a real opportunity
    const analysis = analyzeOpportunityPotential(title, selftext)

    // Skip if not an opportunity (existing product, coding question, etc.)
    if (!analysis.isOpportunity && analysis.confidence === 'high') {
      continue
    }

    // Must have some problem signal
    if (!hasProblemSignal(combined) && !analysis.isOpportunity) {
      continue
    }

    // Extract the specific pain point
    const painSignal = extractPainPoint(combined)

    // Determine source quality based on engagement
    let sourceQuality: 'high' | 'medium' | 'low' = 'low'
    if (data.ups > 50 && data.num_comments > 20) {
      sourceQuality = 'high'
    } else if (data.ups > 15 && data.num_comments > 5) {
      sourceQuality = 'medium'
    }

    painPoints.push({
      source: 'reddit',
      subreddit,
      title,
      text: selftext || title,
      url: `https://reddit.com${data.permalink}`,
      author: data.author || 'anonymous',
      score: data.ups,
      numComments: data.num_comments,
      upvoteRatio: data.upvote_ratio || 0,
      createdUtc,
      ageHours: Math.round(ageHours * 10) / 10,
      painSignal,
      sourceQuality,
    })
  }

  return painPoints
}

/**
 * Remove duplicate posts (same URL or very similar titles)
 */
function deduplicatePosts(posts: RedditPainPoint[]): RedditPainPoint[] {
  const seen = new Set<string>()
  const unique: RedditPainPoint[] = []

  for (const post of posts) {
    // Check URL
    if (seen.has(post.url)) continue

    // Check title similarity (normalized)
    const normalizedTitle = post.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .sort()
      .join(' ')

    let isDupe = false
    for (const seenTitle of seen) {
      if (seenTitle.startsWith('title:')) {
        const existing = seenTitle.slice(6)
        // Simple word overlap check
        const existingWords = new Set(existing.split(' '))
        const newWords = normalizedTitle.split(' ')
        const overlap = newWords.filter(w => existingWords.has(w)).length
        const similarity = overlap / Math.max(existingWords.size, newWords.length)

        if (similarity > 0.6) {
          isDupe = true
          break
        }
      }
    }

    if (!isDupe) {
      seen.add(post.url)
      seen.add(`title:${normalizedTitle}`)
      unique.push(post)
    }
  }

  return unique
}

/**
 * Main collection function - collects from all subreddits and searches
 */
export async function collectRedditPainPoints(limit: number = 30): Promise<RedditPainPoint[]> {
  console.log('[Reddit] Starting pain point collection...')

  let allPainPoints: RedditPainPoint[] = []

  // Method 1: Browse hot/new posts in each subreddit
  for (const subreddit of SUBREDDITS) {
    console.log(`[Reddit] Collecting from r/${subreddit}...`)

    const hotPosts = await fetchSubredditPosts(subreddit, 'hot')
    allPainPoints.push(...hotPosts)

    // Be nice to Reddit - rate limit
    await new Promise(r => setTimeout(r, 1500))

    const newPosts = await fetchSubredditPosts(subreddit, 'new')
    allPainPoints.push(...newPosts)

    await new Promise(r => setTimeout(r, 1500))
  }

  // Method 2: Search for specific pain queries
  console.log('[Reddit] Running pain-focused searches...')

  for (const query of PAIN_QUERIES.slice(0, 5)) { // Limit queries to avoid rate limits
    for (const subreddit of SUBREDDITS.slice(0, 4)) { // Top 4 subreddits
      const searchResults = await searchSubreddit(subreddit, query)
      allPainPoints.push(...searchResults)

      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Deduplicate
  const unique = deduplicatePosts(allPainPoints)

  // Sort by score (highest engagement first)
  unique.sort((a, b) => b.score - a.score)

  console.log(`[Reddit] Collected ${unique.length} unique pain points (from ${allPainPoints.length} total)`)

  return unique.slice(0, limit)
}

/**
 * Convert Reddit pain points to the format expected by the pipeline
 */
export function toGenericPainPoint(reddit: RedditPainPoint): {
  source: string
  title: string
  text: string
  url: string
  author: string
  score: number
  sourceQuality: 'high' | 'medium' | 'low'
} {
  return {
    source: 'reddit',
    title: reddit.title,
    text: reddit.text,
    url: reddit.url,
    author: reddit.author,
    score: reddit.score,
    sourceQuality: reddit.sourceQuality,
  }
}
