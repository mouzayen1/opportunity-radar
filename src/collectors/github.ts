import { RawItem } from '../lib/types';

// Curated list of popular repos to watch for feature requests
const WATCHED_REPOS = [
  // Productivity/Notes
  'obsidianmd/obsidian-releases',
  'toeverything/AFFiNE',
  'logseq/logseq',
  'AppFlowy-IO/AppFlowy',
  'makeplane/plane',

  // Dev Tools
  'supabase/supabase',
  'vercel/next.js',
  'prisma/prisma',
  'drizzle-team/drizzle-orm',
  'shadcn-ui/ui',

  // Automation
  'n8n-io/n8n',
  'automatisch/automatisch',
  'activepieces/activepieces',

  // CRM/Business
  'twentyhq/twenty',
  'erxes/erxes',
  'chatwoot/chatwoot',

  // Analytics/Monitoring
  'plausible/analytics',
  'posthog/posthog',
  'umami-software/umami',

  // Communication
  'element-hq/element-web',
  'zulip/zulip',

  // Other popular tools
  'calcom/cal.com',
  'documenso/documenso',
  'formbricks/formbricks',
  'triggerdotdev/trigger.dev',
];

// Labels that indicate feature requests or improvement opportunities
const RELEVANT_LABELS = [
  'feature-request',
  'feature request',
  'enhancement',
  'help-wanted',
  'help wanted',
  'good first issue',
  'idea',
  'suggestion',
];

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  created_at: string;
  comments: number;
  reactions: {
    '+1': number;
    total_count: number;
  };
  labels: Array<{ name: string }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getGitHubToken(): string | null {
  return process.env.GITHUB_TOKEN ?? null;
}

async function fetchRepoIssues(repo: string): Promise<GitHubIssue[]> {
  const token = getGitHubToken();

  if (!token) {
    console.log('  No GitHub token, skipping GitHub collection');
    return [];
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'OpportunityRadar/2.0',
    Authorization: `Bearer ${token}`,
  };

  // Build label query (any of the relevant labels)
  const labelQuery = RELEVANT_LABELS.map(l => encodeURIComponent(l)).join(',');

  try {
    const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=${labelQuery}&sort=reactions-+1&direction=desc&per_page=30`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  Repo not found or no access: ${repo}`);
        return [];
      }
      if (response.status === 403) {
        console.log(`  Rate limited or forbidden: ${repo}`);
        return [];
      }
      console.error(`  GitHub API error for ${repo}: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error(`  GitHub fetch error for ${repo}:`, error);
    return [];
  }
}

function normalizeIssue(issue: GitHubIssue, repo: string): RawItem {
  // Extract reactions count (thumbs up is most relevant)
  const upvotes = issue.reactions?.['+1'] ?? 0;

  return {
    source: 'github',
    source_id: `${repo.replace('/', '_')}_${issue.number}`,
    source_url: issue.html_url,
    title: `[${repo.split('/')[1]}] ${issue.title}`,
    raw_text: issue.body ?? '',
    upvotes: upvotes,
    comments_count: issue.comments,
    posted_at: new Date(issue.created_at),
  };
}

export async function collectFromGitHub(): Promise<RawItem[]> {
  console.log('Collecting from GitHub...');

  const token = getGitHubToken();
  if (!token) {
    console.log('  GITHUB_TOKEN not set, skipping GitHub collection');
    return [];
  }

  const allIssues = new Map<string, RawItem>();
  const DELAY_BETWEEN_REPOS = 500; // 500ms between repos

  for (const repo of WATCHED_REPOS) {
    console.log(`  Fetching issues from ${repo}...`);
    const issues = await fetchRepoIssues(repo);

    for (const issue of issues) {
      const normalized = normalizeIssue(issue, repo);
      if (!allIssues.has(normalized.source_id)) {
        allIssues.set(normalized.source_id, normalized);
      }
    }

    // Delay between requests
    await sleep(DELAY_BETWEEN_REPOS);
  }

  const items = Array.from(allIssues.values());
  console.log(`  Found ${items.length} unique GitHub issues`);

  return items;
}
