import type { RawOpportunity, LogEntry } from '@/types'

const LOBSTERS_NEWEST = 'https://lobste.rs/newest.json'
const LOBSTERS_HOTTEST = 'https://lobste.rs/hottest.json'

// Tags that indicate relevant developer/tool discussions
const RELEVANT_TAGS = [
  'programming',
  'devops',
  'practices',
  'ask',
  'show',
  'rant',
  'release',
  'web',
  'unix',
  'linux',
  'distributed',
  'databases',
  'api',
  'compsci',
  'networking',
  'security',
  'testing',
  'performance',
]

// Pain-point keywords to look for in titles
const PAIN_KEYWORDS = [
  'frustrated',
  'annoying',
  'broken',
  'hate',
  'terrible',
  'worst',
  'painful',
  'replace',
  'alternative',
  'switch',
  'migrate',
  'wish',
  'need',
  'missing',
  'problem',
  'issue',
  'struggle',
  'difficult',
  'complex',
  'slow',
  'expensive',
  'bloated',
  'overpriced',
  'manual',
  'tedious',
  'workaround',
  'hack',
  'why do we',
  'why is',
  'better way',
  'looking for',
  'how do you',
  'what do you use',
  'ask lobste',
  'rant',
  'tool',
  'automate',
  'simplify',
  'nightmare',
  'waste',
  'stop using',
  'gave up',
  'moved away',
  'dropped',
  'abandoned',
]

const GREENFIELD_SIGNALS = [
  'wish',
  'need',
  'missing',
  'looking for',
  'what do you use',
  'how do you',
  'automate',
  'simplify',
  'tool',
  'ask lobste',
]

function hasRelevantTag(tags: string[]): boolean {
  if (!tags || tags.length === 0) return true // include untagged
  return tags.some((t) => RELEVANT_TAGS.includes(t.toLowerCase()))
}

function hasPainKeyword(title: string): boolean {
  const lower = title.toLowerCase()
  return PAIN_KEYWORDS.some((kw) => lower.includes(kw))
}

function inferType(text: string): 'greenfield' | 'makeItBetter' {
  const lower = text.toLowerCase()
  for (const signal of GREENFIELD_SIGNALS) {
    if (lower.includes(signal)) return 'greenfield'
  }
  return 'makeItBetter'
}

function inferEngagement(score: number): 'high' | 'medium' | 'low' {
  if (score > 50) return 'high'
  if (score > 10) return 'medium'
  return 'low'
}

function calcRecency(dateStr: string): number {
  const createdMs = new Date(dateStr).getTime()
  const nowMs = Date.now()
  return Math.max(0, Math.round((nowMs - createdMs) / (1000 * 86400)))
}

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `lobsters-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'Lobsters',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function collectFromLobsters(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenIds = new Set<string>()

  logs.push(createLog('info', 'Starting Lobsters scan (newest + hottest)...'))

  const endpoints = [
    { url: LOBSTERS_NEWEST, label: 'newest' },
    { url: LOBSTERS_HOTTEST, label: 'hottest' },
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url)

      if (!response.ok) {
        logs.push(createLog('warning', `Lobsters ${endpoint.label}: HTTP ${response.status}`))
        await delay(1000)
        continue
      }

      const stories = await response.json()

      if (!Array.isArray(stories)) {
        logs.push(createLog('warning', `Lobsters ${endpoint.label}: unexpected response format`))
        continue
      }

      let matchCount = 0

      for (const story of stories) {
        const shortId = story.short_id || story.short_id_url
        if (!shortId || seenIds.has(shortId)) continue

        const tags: string[] = story.tags || []
        const title: string = story.title || ''

        // Filter: must have relevant tag AND pain keyword in title
        if (!hasRelevantTag(tags) || !hasPainKeyword(title)) continue

        seenIds.add(shortId)

        const score = story.score || 0
        const description = story.description || story.comment_plain || ''

        const opp: RawOpportunity = {
          id: `lobsters-${shortId}-${Date.now()}`,
          title: title.slice(0, 200),
          problem: description ? description.slice(0, 500) : title,
          source: 'lobsters',
          type: inferType(title),
          engagement: inferEngagement(score),
          recency: calcRecency(story.created_at || new Date().toISOString()),
          url: story.comments_url || story.url || null,
          author: story.submitter_user?.username || story.submitter || undefined,
          points: score,
          commentCount: story.comment_count || 0,
        }

        results.push(opp)
        matchCount++
      }

      logs.push(
        createLog('info', `Lobsters ${endpoint.label}: ${matchCount} pain-point stories found`)
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Lobsters ${endpoint.label} failed: ${errorMsg}`))
    }

    await delay(1000)
  }

  logs.push(
    createLog('success', `Lobsters scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
