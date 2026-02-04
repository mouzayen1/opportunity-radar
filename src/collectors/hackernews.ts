import { RawItem } from '../lib/types';

const ALGOLIA_API_BASE = 'https://hn.algolia.com/api/v1';

// Search queries for different opportunity types
const SEARCH_QUERIES = [
  // GREENFIELD signals
  'looking for tool',
  'need a tool',
  'wish there was',
  'anyone built',
  'does anyone know',
  'is there a',
  'startup idea',

  // MAKE_IT_BETTER signals
  'alternative to',
  'replacement for',
  'switching from',
  'hate using',
  'frustrated with',
  'too expensive',
  'open source alternative',
];

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  author?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchHackerNews(query: string): Promise<AlgoliaHit[]> {
  try {
    // Search stories from the last 90 days
    const url = new URL(`${ALGOLIA_API_BASE}/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('tags', 'story');
    url.searchParams.set('numericFilters', `created_at_i>${Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60}`);
    url.searchParams.set('hitsPerPage', '50');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`HN API error for "${query}": ${response.status}`);
      return [];
    }

    const data: AlgoliaResponse = await response.json();
    return data.hits;
  } catch (error) {
    console.error(`HN search failed for "${query}":`, error);
    return [];
  }
}

function normalizeHit(hit: AlgoliaHit): RawItem | null {
  if (!hit.title) return null;

  const text = hit.story_text || hit.comment_text || '';
  const sourceUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

  return {
    source: 'hackernews',
    source_id: hit.objectID,
    source_url: sourceUrl,
    title: hit.title,
    raw_text: text,
    upvotes: hit.points ?? 0,
    comments_count: hit.num_comments ?? 0,
    posted_at: new Date(hit.created_at),
  };
}

export async function collectFromHackerNews(): Promise<RawItem[]> {
  console.log('Collecting from Hacker News...');
  const allHits = new Map<string, RawItem>();

  for (const query of SEARCH_QUERIES) {
    console.log(`  Searching HN for: "${query}"`);
    const hits = await searchHackerNews(query);

    for (const hit of hits) {
      const normalized = normalizeHit(hit);
      if (normalized && !allHits.has(normalized.source_id)) {
        allHits.set(normalized.source_id, normalized);
      }
    }

    // Small delay between searches
    await sleep(100);
  }

  const items = Array.from(allHits.values());
  console.log(`  Found ${items.length} unique HN stories`);

  return items;
}
