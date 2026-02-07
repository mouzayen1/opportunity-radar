import type { RawOpportunity, LogEntry } from '@/types'

const DEVTO_API = 'https://dev.to/api/articles'

const TAGS = [
  'devtools',
  'productivity',
  'tooling',
  'startup',
  'saas',
  'webdev',
  'beginners',
  'discuss',
  'watercooler',
  'career',
]

// Pain-point signal keywords to look for in titles/descriptions
const PAIN_SIGNALS = [
  'frustrated',
  'annoying',
  'hate',
  'worst',
  'painful',
  'broken',
  'alternative',
  'replace',
  'switch',
  'migrate',
  'wish',
  'need',
  'missing',
  'lack',
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
  'ugly',
  'terrible',
  'better way',
  'looking for',
  'anyone know',
  'how do you',
  'what do you use',
  'recommendation',
  'suggest',
  'tool for',
  'challenge',
  'headache',
  'nightmare',
  'waste',
  'automate',
  'simplify',
  'streamline',
]

const GREENFIELD_SIGNALS = [
  'wish',
  'need',
  'missing',
  'looking for',
  'anyone know',
  'what do you use',
  'how do you',
  'tool for',
  'automate',
  'simplify',
]

function hasPainSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return PAIN_SIGNALS.some((signal) => lower.includes(signal))
}

function inferType(text: string): 'greenfield' | 'makeItBetter' {
  const lower = text.toLowerCase()
  for (const signal of GREENFIELD_SIGNALS) {
    if (lower.includes(signal)) return 'greenfield'
  }
  return 'makeItBetter'
}

function inferEngagement(reactions: number): 'high' | 'medium' | 'low' {
  if (reactions > 50) return 'high'
  if (reactions > 10) return 'medium'
  return 'low'
}

function calcRecency(publishedAt: string): number {
  const publishedMs = new Date(publishedAt).getTime()
  const nowMs = Date.now()
  return Math.max(0, Math.round((nowMs - publishedMs) / (1000 * 86400)))
}

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `devto-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'Dev.to',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function collectFromDevTo(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenIds = new Set<string>()

  logs.push(createLog('info', `Starting Dev.to scan across ${TAGS.length} tags...`))

  for (let ti = 0; ti < TAGS.length; ti++) {
    const tag = TAGS[ti]
    let tagCount = 0

    // Fetch rising articles for this tag
    try {
      const risingUrl = `${DEVTO_API}?tag=${tag}&per_page=15&state=rising`
      const risingRes = await fetch(risingUrl)

      if (risingRes.ok) {
        const articles = await risingRes.json()
        for (const article of articles) {
          if (seenIds.has(String(article.id))) continue

          const combined = `${article.title || ''} ${article.description || ''}`
          if (!hasPainSignal(combined)) continue

          seenIds.add(String(article.id))

          const opp: RawOpportunity = {
            id: `devto-${article.id}-${Date.now()}`,
            title: (article.title || '').slice(0, 200),
            problem: (article.description || article.title || '').slice(0, 500),
            source: 'devto',
            type: inferType(combined),
            engagement: inferEngagement(article.positive_reactions_count || 0),
            recency: calcRecency(article.published_at || new Date().toISOString()),
            url: article.url || null,
            author: article.user?.username || undefined,
            points: article.positive_reactions_count || 0,
            commentCount: article.comments_count || 0,
          }

          results.push(opp)
          tagCount++
        }
      } else {
        logs.push(createLog('warning', `Tag "${tag}" rising: HTTP ${risingRes.status}`))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Tag "${tag}" rising failed: ${errorMsg}`))
    }

    await delay(800)

    // Fetch top articles for this tag (last 7 days)
    try {
      const topUrl = `${DEVTO_API}?tag=${tag}&top=7`
      const topRes = await fetch(topUrl)

      if (topRes.ok) {
        const articles = await topRes.json()
        for (const article of articles) {
          if (seenIds.has(String(article.id))) continue

          const combined = `${article.title || ''} ${article.description || ''}`
          if (!hasPainSignal(combined)) continue

          seenIds.add(String(article.id))

          const opp: RawOpportunity = {
            id: `devto-${article.id}-${Date.now()}`,
            title: (article.title || '').slice(0, 200),
            problem: (article.description || article.title || '').slice(0, 500),
            source: 'devto',
            type: inferType(combined),
            engagement: inferEngagement(article.positive_reactions_count || 0),
            recency: calcRecency(article.published_at || new Date().toISOString()),
            url: article.url || null,
            author: article.user?.username || undefined,
            points: article.positive_reactions_count || 0,
            commentCount: article.comments_count || 0,
          }

          results.push(opp)
          tagCount++
        }
      } else {
        logs.push(createLog('warning', `Tag "${tag}" top: HTTP ${topRes.status}`))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Tag "${tag}" top failed: ${errorMsg}`))
    }

    if (tagCount > 0) {
      logs.push(createLog('info', `Tag "${tag}": ${tagCount} pain-point articles found`))
    }

    // Delay before next tag
    if (ti < TAGS.length - 1) {
      await delay(800)
    }
  }

  logs.push(
    createLog('success', `Dev.to scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
