import type { RawOpportunity, LogEntry } from '@/types'

const REDDIT_SEARCH = 'https://www.reddit.com/r'

// Tiered subreddits
const TIER_1 = ['SaaS', 'selfhosted', 'smallbusiness', 'sysadmin', 'sweatystartup', 'nocode']
const TIER_2 = ['Entrepreneur', 'startups', 'ExperiencedDevs', 'devops', 'ecommerce', 'msp']
const TIER_3 = ['bookkeeping', 'PropertyManagement', 'Veterinary', 'digital_marketing']

const ALL_SUBREDDITS = [...TIER_1, ...TIER_2, ...TIER_3]

// General queries
const GENERAL_QUERIES = [
  'need a tool',
  'looking for software',
  'frustrated with',
  'anyone solved',
  'manual process',
  'spending hours',
  'wish there was',
  'alternative to',
  'too expensive',
  'broken workflow',
]

// Niche queries
const NICHE_QUERIES = [
  'what software do you use',
  'how do you handle',
  'biggest challenge',
  'waste of time',
  'hate this software',
]

// MSP-specific queries
const MSP_QUERIES = [
  'ConnectWise',
  'Datto',
  'worst RMM',
  'PSA tool',
  'switching from',
]

const GREENFIELD_SIGNALS = [
  'need a tool',
  'looking for software',
  'wish there was',
  'anyone solved',
  'what software do you use',
  'how do you handle',
]

function getQueriesForSubreddit(sub: string): string[] {
  const allQueries = sub.toLowerCase() === 'msp'
    ? [...GENERAL_QUERIES, ...MSP_QUERIES]
    : [...GENERAL_QUERIES, ...NICHE_QUERIES]
  // Return top 5
  return allQueries.slice(0, 5)
}

function inferType(text: string, query: string): 'greenfield' | 'makeItBetter' {
  const combined = `${text} ${query}`.toLowerCase()
  for (const signal of GREENFIELD_SIGNALS) {
    if (combined.includes(signal)) return 'greenfield'
  }
  return 'makeItBetter'
}

function inferEngagement(score: number): 'high' | 'medium' | 'low' {
  if (score > 50) return 'high'
  if (score > 10) return 'medium'
  return 'low'
}

function calcRecency(createdUtc: number): number {
  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, Math.round((now - createdUtc) / 86400))
}

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `reddit-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'Reddit',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function collectFromReddit(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenIds = new Set<string>()

  logs.push(createLog('info', `Starting Reddit scan across ${ALL_SUBREDDITS.length} subreddits...`))

  for (let si = 0; si < ALL_SUBREDDITS.length; si++) {
    const sub = ALL_SUBREDDITS[si]
    const queries = getQueriesForSubreddit(sub)
    let subCount = 0

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi]

      try {
        const params = new URLSearchParams({
          q: query,
          sort: 'relevance',
          t: 'month',
          limit: '25',
          restrict_sr: 'on',
        })

        const url = `${REDDIT_SEARCH}/${sub}/search.json?${params.toString()}`
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'OpportunityRadar/4.0 (research bot)',
          },
        })

        if (!response.ok) {
          if (response.status === 403 || response.status === 0) {
            logs.push(createLog('warning', `r/${sub} query "${query}": CORS blocked or forbidden`))
          } else {
            logs.push(createLog('warning', `r/${sub} query "${query}": HTTP ${response.status}`))
          }
          await delay(1500)
          continue
        }

        const data = await response.json()
        const posts = data?.data?.children || []

        for (const child of posts) {
          const post = child.data
          if (!post) continue

          const postId = post.id || post.name
          if (seenIds.has(postId)) continue

          // Filter: score > 3 and selftext length > 50
          const score = post.score || 0
          const selftext = post.selftext || ''
          if (score <= 3) continue
          if (selftext.length <= 50) continue

          seenIds.add(postId)

          const title = post.title || ''
          const problem = selftext.slice(0, 500) || title

          const opp: RawOpportunity = {
            id: `reddit-${postId}-${Date.now()}`,
            title: title.slice(0, 200),
            problem,
            source: 'reddit',
            subreddit: sub,
            type: inferType(`${title} ${selftext}`, query),
            engagement: inferEngagement(score),
            recency: calcRecency(post.created_utc || Math.floor(Date.now() / 1000)),
            url: post.url ? `https://www.reddit.com${post.permalink}` : null,
            author: post.author || undefined,
            points: score,
            commentCount: post.num_comments || 0,
          }

          results.push(opp)
          subCount++
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        // CORS or network errors are expected in browser context
        if (
          errorMsg.includes('CORS') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('Failed to fetch')
        ) {
          logs.push(createLog('warning', `r/${sub}: CORS blocked (expected in browser)`))
        } else {
          logs.push(createLog('error', `r/${sub} query "${query}" failed: ${errorMsg}`))
        }
      }

      // Rate limit delay between queries
      await delay(1500)
    }

    if (subCount > 0) {
      logs.push(createLog('info', `r/${sub}: ${subCount} opportunities found`))
    }
  }

  logs.push(
    createLog('success', `Reddit scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
