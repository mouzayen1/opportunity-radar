import type { RawOpportunity, LogEntry } from '@/types'

const GITHUB_ISSUES_API = 'https://api.github.com/search/issues'
const GITHUB_REPOS_API = 'https://api.github.com/search/repositories'

const ISSUE_QUERIES = [
  '"feature request" label:enhancement',
  '"please add" label:enhancement',
  '"workaround" label:bug',
  '"alternative to" in:readme',
]

const REPO_QUERIES = [
  '"alternative to" stars:>10',
  '"replacement for" stars:>10',
  '"self-hosted" stars:>50',
]

const GREENFIELD_SIGNALS = [
  'alternative to',
  'replacement for',
  'self-hosted',
  'feature request',
  'please add',
]

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

function calcRecency(dateStr: string): number {
  const createdMs = new Date(dateStr).getTime()
  const nowMs = Date.now()
  return Math.max(0, Math.round((nowMs - createdMs) / (1000 * 86400)))
}

function createLog(level: LogEntry['level'], message: string): LogEntry {
  return {
    id: `github-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source: 'GitHub',
    message,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function collectFromGitHub(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const results: RawOpportunity[] = []
  const logs: LogEntry[] = []
  const seenUrls = new Set<string>()

  logs.push(createLog('info', 'Starting GitHub scan (issues + repositories)...'))

  // --- Search Issues ---
  for (let qi = 0; qi < ISSUE_QUERIES.length; qi++) {
    const query = ISSUE_QUERIES[qi]

    try {
      const fullQuery = `${query}+type:issue+state:open`
      const params = new URLSearchParams({
        q: fullQuery,
        per_page: '20',
        sort: 'reactions',
        order: 'desc',
      })

      const url = `${GITHUB_ISSUES_API}?${params.toString()}`
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          logs.push(createLog('warning', `Issue query "${query}": rate limited (403)`))
        } else {
          logs.push(createLog('warning', `Issue query "${query}": HTTP ${response.status}`))
        }
        await delay(2000)
        continue
      }

      const data = await response.json()
      const items = data.items || []

      logs.push(createLog('info', `Issue query "${query}": ${items.length} results`))

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const htmlUrl = item.html_url || ''

        if (seenUrls.has(htmlUrl)) continue
        seenUrls.add(htmlUrl)

        const title = item.title || ''
        const body = (item.body || '').slice(0, 300)
        const reactions = item.reactions?.total_count || 0

        const opp: RawOpportunity = {
          id: `github-issue-${item.id}-${Date.now()}`,
          title: title.slice(0, 200),
          problem: body || title,
          source: 'github',
          type: inferType(`${title} ${body}`),
          engagement: inferEngagement(reactions),
          recency: calcRecency(item.created_at || new Date().toISOString()),
          url: htmlUrl || null,
          author: item.user?.login || undefined,
          points: reactions,
          commentCount: item.comments || 0,
        }

        results.push(opp)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Issue query "${query}" failed: ${errorMsg}`))
    }

    await delay(1500)
  }

  // --- Search Repositories ---
  for (let qi = 0; qi < REPO_QUERIES.length; qi++) {
    const query = REPO_QUERIES[qi]

    try {
      const params = new URLSearchParams({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: '15',
      })

      const url = `${GITHUB_REPOS_API}?${params.toString()}`
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          logs.push(createLog('warning', `Repo query "${query}": rate limited (403)`))
        } else {
          logs.push(createLog('warning', `Repo query "${query}": HTTP ${response.status}`))
        }
        await delay(2000)
        continue
      }

      const data = await response.json()
      const items = data.items || []

      logs.push(createLog('info', `Repo query "${query}": ${items.length} results`))

      for (let i = 0; i < items.length; i++) {
        const repo = items[i]
        const htmlUrl = repo.html_url || ''

        if (seenUrls.has(htmlUrl)) continue
        seenUrls.add(htmlUrl)

        const title = repo.full_name || repo.name || ''
        const description = (repo.description || '').slice(0, 300)
        const stars = repo.stargazers_count || 0

        const opp: RawOpportunity = {
          id: `github-repo-${repo.id}-${Date.now()}`,
          title: `${title}: ${description}`.slice(0, 200),
          problem: description || `Repository: ${title}`,
          source: 'github',
          type: inferType(`${title} ${description}`),
          engagement: inferEngagement(stars),
          recency: calcRecency(repo.created_at || new Date().toISOString()),
          url: htmlUrl || null,
          author: repo.owner?.login || undefined,
          points: stars,
          commentCount: repo.open_issues_count || 0,
        }

        results.push(opp)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logs.push(createLog('error', `Repo query "${query}" failed: ${errorMsg}`))
    }

    await delay(1500)
  }

  logs.push(
    createLog('success', `GitHub scan complete: ${results.length} opportunities collected`)
  )

  return { results, logs }
}
