/**
 * GitHub Issues Pain Point Fetcher
 *
 * Uses GitHub CLI to search for issues that indicate pain points.
 * Looks for feature requests, frustrations, and common complaints.
 */

import { execSync } from 'child_process'

interface GitHubIssue {
  title: string
  body: string
  url: string
  author: string
  createdAt: string
  repository: string
  reactions: number
}

interface PainPoint {
  source: 'github'
  title: string
  text: string
  url: string
  author: string
  score: number
  date: string
  repository: string
}

// Search queries that find pain points
const SEARCH_QUERIES = [
  'is:issue is:open "feature request" sort:reactions-+1-desc',
  'is:issue is:open "would be nice" sort:reactions-+1-desc',
  'is:issue is:open "frustrating" sort:reactions-+1-desc',
  'is:issue is:open "need" "better" sort:reactions-+1-desc',
  'is:issue is:open label:enhancement sort:reactions-+1-desc',
]

function runGhCommand(query: string, limit: number = 20): GitHubIssue[] {
  try {
    const result = execSync(
      `gh search issues "${query}" --limit ${limit} --json title,body,url,author,createdAt,repository,reactions`,
      { encoding: 'utf-8', timeout: 30000 }
    )

    const issues = JSON.parse(result)
    return issues.map((issue: any) => ({
      title: issue.title,
      body: issue.body || '',
      url: issue.url,
      author: issue.author?.login || 'unknown',
      createdAt: issue.createdAt,
      repository: `${issue.repository?.owner}/${issue.repository?.name}`,
      reactions: issue.reactions?.total_count || 0,
    }))
  } catch (error) {
    console.error(`Failed to run gh command for query: ${query}`, error)
    return []
  }
}

export async function fetchGitHubPainPoints(limit: number = 50): Promise<PainPoint[]> {
  console.log('Fetching GitHub issues pain points...')

  const allIssues: GitHubIssue[] = []

  for (const query of SEARCH_QUERIES) {
    console.log(`Searching: ${query.slice(0, 50)}...`)
    const issues = runGhCommand(query, Math.ceil(limit / SEARCH_QUERIES.length))
    allIssues.push(...issues)

    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Deduplicate by URL
  const uniqueIssues = Array.from(
    new Map(allIssues.map(issue => [issue.url, issue])).values()
  )

  // Sort by reactions (engagement = pain indicator)
  uniqueIssues.sort((a, b) => b.reactions - a.reactions)

  const painPoints: PainPoint[] = uniqueIssues.slice(0, limit).map(issue => ({
    source: 'github',
    title: issue.title,
    text: issue.body.slice(0, 500) || issue.title,
    url: issue.url,
    author: issue.author,
    score: Math.min(issue.reactions, 100), // Cap at 100 for normalization
    date: issue.createdAt,
    repository: issue.repository,
  }))

  console.log(`Found ${painPoints.length} pain points from GitHub`)
  return painPoints
}

// Run if called directly
if (require.main === module) {
  fetchGitHubPainPoints(10).then(points => {
    console.log('\n--- Results ---')
    points.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.title}`)
      console.log(`   Repo: ${p.repository} | Reactions: ${p.score}`)
      console.log(`   URL: ${p.url}`)
    })
  })
}
