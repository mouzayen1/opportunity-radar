/**
 * Hacker News Pain Point Fetcher
 *
 * Fetches "Ask HN" posts and discussions that indicate pain points.
 * Looks for patterns like:
 * - "Ask HN: What's the best way to..."
 * - "I'm frustrated with..."
 * - "Why is there no good..."
 * - "I wish there was..."
 */

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0'

interface HNItem {
  id: number
  type: string
  title?: string
  text?: string
  by?: string
  time?: number
  url?: string
  score?: number
  descendants?: number
  kids?: number[]
}

interface PainPoint {
  source: 'hackernews'
  title: string
  text: string
  url: string
  author: string
  score: number
  date: string
}

// Keywords that indicate pain points
const PAIN_KEYWORDS = [
  'frustrated',
  'annoying',
  'wish there was',
  'why is there no',
  'hate',
  'terrible',
  'broken',
  'doesn\'t work',
  'need a better',
  'looking for',
  'alternative to',
  'problem with',
  'struggle',
  'difficult to',
  'waste time',
  'spending hours',
]

// Keywords for "Ask HN" posts that often contain pain points
const ASK_HN_KEYWORDS = [
  'ask hn:',
  'tell hn:',
  'show hn:',
]

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch item ${id}:`, error)
    return null
  }
}

async function fetchTopStories(limit: number = 100): Promise<number[]> {
  try {
    const response = await fetch(`${HN_API_BASE}/topstories.json`)
    if (!response.ok) return []
    const ids = await response.json()
    return ids.slice(0, limit)
  } catch (error) {
    console.error('Failed to fetch top stories:', error)
    return []
  }
}

async function fetchAskStories(limit: number = 100): Promise<number[]> {
  try {
    const response = await fetch(`${HN_API_BASE}/askstories.json`)
    if (!response.ok) return []
    const ids = await response.json()
    return ids.slice(0, limit)
  } catch (error) {
    console.error('Failed to fetch ask stories:', error)
    return []
  }
}

function containsPainKeywords(text: string): boolean {
  const lowerText = text.toLowerCase()
  return PAIN_KEYWORDS.some(keyword => lowerText.includes(keyword))
}

function isAskHN(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  return ASK_HN_KEYWORDS.some(keyword => lowerTitle.includes(keyword))
}

export async function fetchHackerNewsPainPoints(limit: number = 50): Promise<PainPoint[]> {
  console.log('Fetching Hacker News pain points...')

  const painPoints: PainPoint[] = []

  // Fetch Ask HN stories (often contain pain points)
  const askIds = await fetchAskStories(100)

  // Fetch top stories too
  const topIds = await fetchTopStories(100)

  const allIds = [...new Set([...askIds, ...topIds])]

  console.log(`Processing ${allIds.length} stories...`)

  for (const id of allIds) {
    if (painPoints.length >= limit) break

    const item = await fetchItem(id)
    if (!item || !item.title) continue

    // Check if this looks like a pain point
    const titleText = item.title + ' ' + (item.text || '')
    if (containsPainKeywords(titleText) || isAskHN(item.title)) {
      painPoints.push({
        source: 'hackernews',
        title: item.title,
        text: item.text || item.title,
        url: `https://news.ycombinator.com/item?id=${item.id}`,
        author: item.by || 'anonymous',
        score: item.score || 0,
        date: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
      })
    }

    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`Found ${painPoints.length} pain points`)
  return painPoints
}

// Run if called directly
if (require.main === module) {
  fetchHackerNewsPainPoints(20).then(points => {
    console.log('\n--- Results ---')
    points.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.title}`)
      console.log(`   Score: ${p.score} | Author: ${p.author}`)
      console.log(`   URL: ${p.url}`)
    })
  })
}
