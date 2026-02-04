import { RawItem } from '../lib/types';

const SUBREDDITS = [
  'SaaS',
  'startups',
  'Entrepreneur',
  'selfhosted',
  'smallbusiness',
  'Notion',
  'Obsidian',
];

// Search queries for Reddit
const SEARCH_QUERIES = [
  // GREENFIELD signals
  'looking for',
  'need a tool',
  'wish there was',
  'anyone know',
  'does anyone',
  'startup idea',

  // MAKE_IT_BETTER signals
  'alternative to',
  'replacement for',
  'switching from',
  'hate',
  'frustrated',
  'too expensive',
];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    ups: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<RedditResponse | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpportunityRadar/2.0 (https://github.com/opportunity-radar)',
        },
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 2000; // 2s, 4s, 8s
        console.log(`  Rate limited, waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      console.error(`Reddit API error: ${response.status}`);
      return null;
    } catch (error) {
      console.error('Reddit fetch error:', error);
      if (i < maxRetries - 1) {
        await sleep(2000);
      }
    }
  }

  return null;
}

async function searchSubreddit(subreddit: string, query: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=month&limit=25`;

  const data = await fetchWithRetry(url);
  return data?.data?.children ?? [];
}

function normalizePost(post: RedditPost): RawItem {
  const data = post.data;

  return {
    source: 'reddit',
    source_id: `${data.subreddit}_${data.id}`,
    source_url: `https://reddit.com${data.permalink}`,
    title: data.title,
    raw_text: data.selftext || '',
    upvotes: data.ups,
    comments_count: data.num_comments,
    posted_at: new Date(data.created_utc * 1000),
  };
}

export async function collectFromReddit(): Promise<RawItem[]> {
  console.log('Collecting from Reddit...');
  const allPosts = new Map<string, RawItem>();
  const BASE_DELAY = 2000; // 2 seconds between requests

  for (const subreddit of SUBREDDITS) {
    console.log(`  Searching r/${subreddit}...`);

    for (const query of SEARCH_QUERIES) {
      const posts = await searchSubreddit(subreddit, query);

      for (const post of posts) {
        const normalized = normalizePost(post);
        if (!allPosts.has(normalized.source_id)) {
          allPosts.set(normalized.source_id, normalized);
        }
      }

      // Delay between requests to respect rate limits
      await sleep(BASE_DELAY);
    }
  }

  const items = Array.from(allPosts.values());
  console.log(`  Found ${items.length} unique Reddit posts`);

  return items;
}
