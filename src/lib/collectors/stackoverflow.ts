import type { RawOpportunity, LogEntry } from '@/types'

const SO_API = 'https://api.stackexchange.com/2.3/search'

const QUERIES = [
  'is there a tool',
  'alternative to',
  'better way to',
  'automate',
  'workaround for',
]

const GREENFIELD_SIGNALS = [
  'is there a tool',
  'alternative to',
  'automate',
]

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

function calcRecency(creationDate: number): number {
  const nowSec = Math.floor(Date.now() / 1000)
  return Math.max(0, Math.round((nowSec - creationDate) / 86400))
}

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `so-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'StackOverflow',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function collectFromStackOverflow(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenIds = new Set<string>()

  logs.push(createLog('info', `Starting StackOverflow scan with ${QUERIES.length} queries...`))

  const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 86400

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const query = QUERIES[qi]

    try {
      const params = new URLSearchParams({
        order: 'desc',
        sort: 'votes',
        intitle: query,
        site: 'stackoverflow',
        fromdate: String(ninetyDaysAgo),
        pagesize: '20',
        filter: 'withbody',
      })

      const url = `${SO_API}?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        logs.push(createLog('warning', `Query "${query}": HTTP ${response.status}`))
        await delay(1000)
        continue
      }

      const data = await response.json()

      // Check for API quota/throttle
      if (data.backoff) {
        logs.push(
          createLog('warning', `StackOverflow API backoff: ${data.backoff}s (throttled)`)
        )
        await delay(data.backoff * 1000)
      }

      const items = data.items || []
      logs.push(createLog('info', `Query "${query}": ${items.length} results`))

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const questionId = String(item.question_id)

        if (seenIds.has(questionId)) continue
        seenIds.add(questionId)

        const title = item.title || ''
        const body = stripHtml(item.body || '').slice(0, 500)
        const score = item.score || 0

        const opp: RawOpportunity = {
          id: `stackoverflow-${questionId}-${Date.now()}`,
          title: stripHtml(title).slice(0, 200),
          problem: body || title,
          source: 'stackoverflow',
          type: inferType(`${title} ${body}`, query),
          engagement: inferEngagement(score),
          recency: calcRecency(item.creation_date || Math.floor(Date.now() / 1000)),
          url: item.link || `https://stackoverflow.com/questions/${questionId}`,
          author: item.owner?.display_name || undefined,
          points: score,
          commentCount: item.answer_count || 0,
        }

        results.push(opp)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Query "${query}" failed: ${errorMsg}`))
    }

    // Rate limit delay
    if (qi < QUERIES.length - 1) {
      await delay(1000)
    }
  }

  logs.push(
    createLog('success', `StackOverflow scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
