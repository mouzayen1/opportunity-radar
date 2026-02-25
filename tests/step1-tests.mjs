// Step 1: Harvest — Automated Verification Tests
// Tests HN Algolia API integration and data transformation logic

// ─── Utility ────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Query tiers ────────────────────────────────────────────────────────────

const TIER1 = ["I would pay for", "shut up and take my money", "someone should build", "wish there was", "why doesn't exist", "is there a tool that"];
const TIER2 = ["frustrated with", "hate using", "terrible experience", "waste of time", "spending hours", "there has to be a better way", "manually", "drives me crazy"];
const TIER3 = ["alternative to", "switching from", "too expensive", "overpriced", "looking for replacement", "self-hosted alternative"];

const ALL_QUERIES = [
  ...TIER1.map(q => ({ query: q, tier: 1 })),
  ...TIER2.map(q => ({ query: q, tier: 2 })),
  ...TIER3.map(q => ({ query: q, tier: 3 })),
];

// ─── Harvest logic ──────────────────────────────────────────────────────────

async function harvestQuery(query, tier) {
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 86400000) / 1000);
  const params = new URLSearchParams({
    query,
    tags: '(story,ask_hn,show_hn,comment)',
    numericFilters: `created_at_i>${ninetyDaysAgo}`,
    hitsPerPage: '20',
  });
  const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.hits || []).map(hit => ({
    id: `hn-${hit.objectID}`,
    item_kind: hit.comment_text ? 'comment' : 'story',
    source: 'hackernews',
    source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    title: hit.title || hit.story_title || '',
    body: stripHtml(hit.comment_text || hit.story_text || ''),
    points: hit.points || 0,
    num_comments: hit.num_comments || 0,
    created_at: new Date(hit.created_at_i * 1000).toISOString(),
    query_matched: query,
    query_tier: tier,
  }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Test runner ────────────────────────────────────────────────────────────

const results = [];

function pass(name, details) {
  console.log(`TEST ${name} ... PASS \u2705 (${details})`);
  results.push(true);
}

function fail(name, details) {
  console.log(`TEST ${name} ... FAIL \u274C (${details})`);
  results.push(false);
}

// Shared state between tests
let miniHarvestItems = [];
let fullHarvestItems = [];

// ─── TEST 1.1: API connectivity ────────────────────────────────────────────

async function test1_1() {
  const name = '1.1: API connectivity';
  try {
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 86400000) / 1000);
    const params = new URLSearchParams({
      query: 'frustrated with',
      tags: '(story,ask_hn,show_hn,comment)',
      numericFilters: `created_at_i>${ninetyDaysAgo}`,
      hitsPerPage: '5',
    });
    const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`);

    if (res.status !== 200) {
      return fail(name, `Expected HTTP 200, got ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data.hits)) {
      return fail(name, 'response.hits is not an array');
    }
    if (data.hits.length === 0) {
      return fail(name, 'response.hits is empty');
    }

    const missingFields = data.hits.filter(h => !h.objectID || h.created_at_i === undefined);
    if (missingFields.length > 0) {
      return fail(name, `${missingFields.length} hits missing objectID or created_at_i`);
    }

    pass(name, `HTTP 200, ${data.hits.length} hits, all have objectID & created_at_i`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 1.2: Data shape ──────────────────────────────────────────────────

async function test1_2() {
  const name = '1.2: Data shape';
  try {
    // First query from each tier
    const queries = [
      { query: TIER1[0], tier: 1 },
      { query: TIER2[0], tier: 2 },
      { query: TIER3[0], tier: 3 },
    ];

    for (const { query, tier } of queries) {
      const items = await harvestQuery(query, tier);
      miniHarvestItems.push(...items);
      await sleep(200);
    }

    if (miniHarvestItems.length === 0) {
      return fail(name, 'Mini harvest returned 0 items');
    }

    const errors = [];

    for (const item of miniHarvestItems) {
      if (!item.id) errors.push(`Missing id on item`);
      if (!item.item_kind) errors.push(`Missing item_kind on ${item.id}`);
      if (!item.source) errors.push(`Missing source on ${item.id}`);
      if (!item.source_url) errors.push(`Missing source_url on ${item.id}`);
      if (!item.title && !item.body) errors.push(`Missing both title and body on ${item.id}`);
      if (item.points === undefined) errors.push(`Missing points on ${item.id}`);
      if (item.num_comments === undefined) errors.push(`Missing num_comments on ${item.id}`);

      if (item.item_kind !== 'comment' && item.item_kind !== 'story') {
        errors.push(`Invalid item_kind "${item.item_kind}" on ${item.id}`);
      }

      if (!/^https:\/\/news\.ycombinator\.com\/item\?id=\d+$/.test(item.source_url)) {
        errors.push(`Invalid source_url "${item.source_url}" on ${item.id}`);
      }
    }

    if (errors.length > 0) {
      return fail(name, `${errors.length} errors: ${errors.slice(0, 5).join('; ')}`);
    }

    pass(name, `${miniHarvestItems.length} items all have correct shape`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 1.3: URL validity (sample check) ─────────────────────────────────

async function test1_3() {
  const name = '1.3: URL validity';
  try {
    if (miniHarvestItems.length < 5) {
      return fail(name, `Need at least 5 items from mini harvest, got ${miniHarvestItems.length}`);
    }

    // Pick 5 random items
    const shuffled = [...miniHarvestItems].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, 5);

    let successCount = 0;
    const details = [];

    for (const item of sample) {
      try {
        // HN does not support HEAD requests (returns 405), use GET instead
        const res = await fetch(item.source_url, { method: 'GET', redirect: 'follow' });
        if (res.ok) {
          successCount++;
          details.push(`${item.source_url} -> 200`);
        } else {
          details.push(`${item.source_url} -> ${res.status}`);
        }
      } catch (err) {
        details.push(`${item.source_url} -> ERR: ${err.message}`);
      }
    }

    if (successCount >= 4) {
      pass(name, `${successCount}/5 URLs returned HTTP 200`);
    } else {
      fail(name, `Only ${successCount}/5 URLs returned HTTP 200. Details: ${details.join('; ')}`);
    }
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 1.4: Volume check ────────────────────────────────────────────────

async function test1_4() {
  const name = '1.4: Volume check';
  try {
    console.log('  (Running full harvest — 20 queries with 200ms delays...)')
    for (const { query, tier } of ALL_QUERIES) {
      const items = await harvestQuery(query, tier);
      fullHarvestItems.push(...items);
      await sleep(200);
    }

    const count = fullHarvestItems.length;
    console.log(`  (Full harvest returned ${count} items)`);

    if (count < 100) {
      return fail(name, `Total items ${count} < 100 minimum`);
    }
    if (count > 600) {
      return fail(name, `Total items ${count} > 600 maximum`);
    }

    pass(name, `${count} items (expected 100-600)`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 1.5: item_kind accuracy ──────────────────────────────────────────

async function test1_5() {
  const name = '1.5: item_kind accuracy';
  try {
    if (fullHarvestItems.length === 0) {
      return fail(name, 'No items from full harvest to validate');
    }

    const comments = fullHarvestItems.filter(i => i.item_kind === 'comment');
    const stories = fullHarvestItems.filter(i => i.item_kind === 'story');

    const emptyBodyComments = comments.filter(c => !c.body || c.body.length === 0);
    const emptyTitleStories = stories.filter(s => !s.title || s.title.length === 0);

    const errors = [];
    if (emptyBodyComments.length > 0) {
      errors.push(`${emptyBodyComments.length} comments with empty body`);
    }
    if (emptyTitleStories.length > 0) {
      errors.push(`${emptyTitleStories.length} stories with empty title`);
    }

    if (errors.length > 0) {
      return fail(name, errors.join('; '));
    }

    pass(name, `${comments.length} comments all have body, ${stories.length} stories all have title`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 1.6: No duplicates by objectID ───────────────────────────────────

async function test1_6() {
  const name = '1.6: No duplicates';
  try {
    if (fullHarvestItems.length === 0) {
      return fail(name, 'No items from full harvest to validate');
    }

    const ids = fullHarvestItems.map(i => i.id);
    const uniqueIds = new Set(ids);

    if (uniqueIds.size === ids.length) {
      pass(name, `All ${ids.length} IDs are unique`);
    } else {
      const dupeCount = ids.length - uniqueIds.size;
      fail(name, `${dupeCount} duplicate IDs found out of ${ids.length} total`);
    }
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 1: HARVEST — Automated Verification Tests ===\n');

await test1_1();
await test1_2();
await test1_3();
await test1_4();
await test1_5();
await test1_6();

console.log('\n=== SUMMARY ===');
const passed = results.filter(Boolean).length;
const total = results.length;

if (passed === total) {
  console.log(`STEP 1 PASSED \u2705 \u2014 All ${total} tests passed`);
} else {
  console.log(`STEP 1 FAILED \u274C \u2014 ${passed}/${total} tests passed`);
}

process.exit(passed === total ? 0 : 1);
