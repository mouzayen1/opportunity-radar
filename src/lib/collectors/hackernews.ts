import type { RawOpportunity, LogEntry } from '@/types'

const HN_API = 'https://hn.algolia.com/api/v1/search'

const QUERIES = [
  'wish there was a tool',
  'someone should build',
  'frustrated with',
  'why is there no',
  'I would pay for',
  'looking for alternative to',
  'terrible experience',
  'switching from',
  'too expensive',
  'anyone know a tool',
  'is there a tool that',
  "can't find a good",
  'hate using',
  'waste of time',
  'manual process',
  'there has to be a better way',
  'broke my workflow',
  'need a simple',
  'overpriced',
  'bloated',
]

// Keywords that signal a greenfield opportunity (nothing exists yet)
const GREENFIELD_SIGNALS = [
  'wish there was',
  'someone should build',
  'why is there no',
  'is there a tool',
  "can't find",
  'need a simple',
  'anyone know a tool',
]

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferType(text: string, query: string): 'greenfield' | 'makeItBetter' {
  const combined = `${text} ${query}`.toLowerCase()
  for (const signal of GREENFIELD_SIGNALS) {
    if (combined.includes(signal)) return 'greenfield'
  }
  return 'makeItBetter'
}

function inferEngagement(points: number): 'high' | 'medium' | 'low' {
  if (points > 50) return 'high'
  if (points > 10) return 'medium'
  return 'low'
}

function calcRecency(createdAtUnix: number): number {
  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, Math.round((now - createdAtUnix) / 86400))
}

function createLog(
  level: LogEntry['level'],
  message: string,
): LogEntry {
  return {
    id: `hn-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'HackerNews',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function collectFromHackerNews(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenIds = new Set<string>()

  logs.push(createLog('info', `Starting HackerNews scan with ${QUERIES.length} keyword queries...`))

  const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 86400

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const query = QUERIES[qi]

    try {
      const params = new URLSearchParams({
        query,
        tags: '(story,ask_hn,comment)',
        numericFilters: `created_at_i>${ninetyDaysAgo}`,
        hitsPerPage: '20',
      })

      const url = `${HN_API}?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        logs.push(createLog('warning', `Query "${query}" returned HTTP ${response.status}`))
        await delay(500)
        continue
      }

      const data = await response.json()
      const hits = data.hits || []

      logs.push(
        createLog('info', `Query "${query}": ${hits.length} results`)
      )

      for (let i = 0; i < hits.length; i++) {
        const hit = hits[i]
        const objectID = hit.objectID

        // Deduplicate within this collection run
        if (seenIds.has(objectID)) continue
        seenIds.add(objectID)

        const title = hit.title || hit.story_title || ''
        const rawText = hit.comment_text || hit.story_text || ''
        const cleanText = stripHtml(rawText)
        const problem = cleanText || title || `HN discussion matching "${query}"`
        const points = hit.points || hit.story_points || 0
        const numComments = hit.num_comments || 0

        const opp: RawOpportunity = {
          id: `hackernews-${objectID}-${Date.now()}`,
          title: title || problem.slice(0, 120),
          problem: problem.slice(0, 500),
          source: 'hackernews',
          type: inferType(problem, query),
          engagement: inferEngagement(points),
          recency: calcRecency(hit.created_at_i || Math.floor(Date.now() / 1000)),
          url: `https://news.ycombinator.com/item?id=${objectID}`,
          author: hit.author || undefined,
          points,
          commentCount: numComments,
        }

        results.push(opp)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Query "${query}" failed: ${errorMsg}`))
    }

    // Rate limit delay between queries
    if (qi < QUERIES.length - 1) {
      await delay(500)
    }
  }

  logs.push(
    createLog('success', `HackerNews scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
