// Step 2: Filter — Automated Verification Tests
// Tests rule-based filtering, deduplication, noise rejection, pain signal detection

// ─── Utility ────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// ─── Filter functions ───────────────────────────────────────────────────────

function passesEngagement(item) {
  if (item.item_kind === 'story') {
    return item.points >= 5 || item.num_comments >= 10;
  }
  return (item.body || '').length >= 80;
}

function passesLength(item) {
  return `${item.title || ''} ${item.body || ''}`.trim().length >= 60;
}

const NOISE_PATTERNS = [
  /```[\s\S]{30,}/,
  /\b(error|exception|stack ?trace|segfault|undefined is not|cannot read property)\b/i,
  /\b(npm install|pip install|cargo build|docker run)\b/i,
  /^(how to|guide to|introduction to|tutorial|getting started with)/i,
  /^(the (definitive|complete|ultimate|comprehensive) guide)/i,
  /^\d+ (things|ways|tips|tricks|reasons|tools|steps)/i,
  /\b(we('re| are) hiring|job opening|looking for .{0,20}(developer|engineer))\b/i,
  /\b(karma|flagged|downvote|moderator|dang said)\b/i,
];

function passesNoise(item) {
  const text = `${item.title || ''} ${item.body || ''}`;
  return !NOISE_PATTERNS.some(p => p.test(text));
}

function passesShowHN(item) {
  if (/^show hn/i.test(item.title || '')) {
    return item.num_comments >= 30;
  }
  return true;
}

const PAIN_SIGNALS = [
  /wish there was/i, /someone should build/i, /frustrated with/i,
  /hate using/i, /too expensive/i, /looking for (an? )?alternative/i,
  /switching (from|away)/i, /anyone know (a|of) (tool|app|software|service)/i,
  /waste of time/i, /manual(ly)?/i,
  /hours? (every|each|per|a) (week|day|month)/i,
  /there has to be a better way/i, /can't find a good/i,
  /I would pay/i, /take my money/i, /broken workflow/i,
  /need a simple/i, /why (is there no|isn't there|doesn't|can't)/i,
  /\boverpriced\b/i, /terrible (experience|UX|UI|interface|support)/i,
  /drives? me crazy/i, /\bditch(ed|ing)?\b/i,
  /\breplac(e|ing|ement)\b/i, /\bbloated\b/i, /\bclunky\b/i,
];

function passesPainSignal(item) {
  if (item.points >= 100 || item.num_comments >= 50) return true;
  const text = `${item.title || ''} ${item.body || ''}`;
  return PAIN_SIGNALS.some(p => p.test(text));
}

function deduplicateItems(items) {
  const seen = new Map();
  for (const item of items) {
    const key = (item.title || item.body?.slice(0, 80) || '')
      .toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing || (item.points + item.num_comments) > (existing.points + existing.num_comments)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

// ─── Full filter pipeline with stats ────────────────────────────────────────

function applyAllFilters(rawItems) {
  const raw = rawItems.length;
  const afterEngagementArr = rawItems.filter(passesEngagement);
  const afterLengthArr = afterEngagementArr.filter(passesLength);
  const afterNoiseArr = afterLengthArr.filter(passesNoise);
  const afterShowHNArr = afterNoiseArr.filter(passesShowHN);
  const afterPainArr = afterShowHNArr.filter(passesPainSignal);
  const afterDedupArr = deduplicateItems(afterPainArr);

  return {
    filtered: afterDedupArr,
    raw,
    afterEngagement: afterEngagementArr.length,
    afterLength: afterLengthArr.length,
    afterNoise: afterNoiseArr.length,
    afterShowHN: afterShowHNArr.length,
    afterPain: afterPainArr.length,
    afterDedup: afterDedupArr.length,
    removedByEngagement: raw - afterEngagementArr.length,
    removedByLength: afterEngagementArr.length - afterLengthArr.length,
    removedByNoise: afterLengthArr.length - afterNoiseArr.length,
    removedByShowHN: afterNoiseArr.length - afterShowHNArr.length,
    removedByPain: afterShowHNArr.length - afterPainArr.length,
    removedByDedup: afterPainArr.length - afterDedupArr.length,
  };
}

// ─── Test runner ────────────────────────────────────────────────────────────

const testResults = [];

function pass(name, details) {
  console.log(`TEST ${name} ... PASS \u2705 (${details})`);
  testResults.push(true);
}

function fail(name, details) {
  console.log(`TEST ${name} ... FAIL \u274C (${details})`);
  testResults.push(false);
}

// Shared state
let rawItems = [];
let filterStats = null;

// ─── TEST 2.1: Volume reduction is in expected range ────────────────────────

async function test2_1() {
  const name = '2.1: Volume reduction';
  try {
    console.log('  (Running full harvest - 20 queries with 200ms delays...)');
    for (const { query, tier } of ALL_QUERIES) {
      const items = await harvestQuery(query, tier);
      rawItems.push(...items);
      await sleep(200);
    }
    console.log(`  (Harvested ${rawItems.length} raw items)`);

    filterStats = applyAllFilters(rawItems);
    const rawCount = filterStats.raw;
    const filteredCount = filterStats.afterDedup;
    const reductionPct = ((1 - filteredCount / rawCount) * 100).toFixed(1);

    console.log(`  (Raw: ${rawCount}, Filtered: ${filteredCount}, Reduction: ${reductionPct}%)`);

    const errors = [];
    if (filteredCount >= rawCount) errors.push(`filtered (${filteredCount}) >= raw (${rawCount})`);
    if (filteredCount < 30) errors.push(`filtered (${filteredCount}) < 30 minimum`);
    if (filteredCount > rawCount * 0.6) errors.push(`filtered (${filteredCount}) > 60% of raw (${Math.floor(rawCount * 0.6)})`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `Raw=${rawCount}, Filtered=${filteredCount}, Reduction=${reductionPct}%`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.2: Filter stats add up ─────────────────────────────────────────

function test2_2() {
  const name = '2.2: Filter stats add up';
  try {
    if (!filterStats) return fail(name, 'No filter stats from TEST 2.1');

    const s = filterStats;
    const sumRemovals = s.removedByEngagement + s.removedByLength + s.removedByNoise
      + s.removedByShowHN + s.removedByPain + s.removedByDedup;
    const expectedFinal = s.raw - sumRemovals;

    if (expectedFinal !== s.afterDedup) {
      return fail(name, `raw(${s.raw}) - sum_removals(${sumRemovals}) = ${expectedFinal}, but final = ${s.afterDedup}`);
    }

    // Verify each stage
    const stageErrors = [];
    if (s.afterEngagement !== s.raw - s.removedByEngagement)
      stageErrors.push('engagement stage mismatch');
    if (s.afterLength !== s.afterEngagement - s.removedByLength)
      stageErrors.push('length stage mismatch');
    if (s.afterNoise !== s.afterLength - s.removedByNoise)
      stageErrors.push('noise stage mismatch');
    if (s.afterShowHN !== s.afterNoise - s.removedByShowHN)
      stageErrors.push('showHN stage mismatch');
    if (s.afterPain !== s.afterShowHN - s.removedByPain)
      stageErrors.push('pain stage mismatch');
    if (s.afterDedup !== s.afterPain - s.removedByDedup)
      stageErrors.push('dedup stage mismatch');

    if (stageErrors.length > 0) return fail(name, stageErrors.join('; '));

    pass(name, `raw(${s.raw}) - removals(${sumRemovals}) = final(${s.afterDedup}), all stages consistent`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.3: Noise patterns actually catch noise ──────────────────────────

function test2_3() {
  const name = '2.3: Noise patterns catch noise';
  try {
    const noiseItems = [
      {
        title: 'How to install Node.js on Ubuntu',
        body: 'npm install -g node',
        item_kind: 'story', points: 10, num_comments: 15,
      },
      {
        title: '15 Tips for Better React Performance',
        body: 'some content here that is long enough to pass length filter',
        item_kind: 'story', points: 10, num_comments: 15,
      },
      {
        title: "We're hiring senior engineers",
        body: 'looking for developers to join',
        item_kind: 'story', points: 10, num_comments: 15,
      },
      {
        title: 'Code block test',
        body: "```python\nimport os\nos.system('echo hello world and more stuff here')\n```",
        item_kind: 'story', points: 10, num_comments: 15,
      },
    ];

    const leaked = [];
    for (const item of noiseItems) {
      if (passesNoise(item)) {
        leaked.push(item.title);
      }
    }

    if (leaked.length > 0) return fail(name, `${leaked.length} items not rejected: ${leaked.join('; ')}`);
    pass(name, `All ${noiseItems.length} noise items correctly rejected`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.4: Pain signals keep real pain ──────────────────────────────────

function test2_4() {
  const name = '2.4: Pain signals keep real pain';
  try {
    const painItems = [
      {
        title: 'I would pay for a tool that does X',
        body: 'frustrated with manual process of doing things every day',
        item_kind: 'story', points: 20, num_comments: 15,
      },
      {
        title: 'Looking for alternative to Salesforce',
        body: 'too expensive for our small team and bloated',
        item_kind: 'story', points: 15, num_comments: 12,
      },
      {
        title: "Why doesn't a simple X exist?",
        body: 'waste of time doing it manually every single week',
        item_kind: 'story', points: 10, num_comments: 11,
      },
    ];

    const rejected = [];
    for (const item of painItems) {
      if (!passesPainSignal(item)) {
        rejected.push(item.title);
      }
    }

    if (rejected.length > 0) return fail(name, `${rejected.length} pain items wrongly rejected: ${rejected.join('; ')}`);
    pass(name, `All ${painItems.length} pain items correctly kept`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.5: High-engagement bypass works ─────────────────────────────────

function test2_5() {
  const name = '2.5: High-engagement bypass';
  try {
    const highEngagement = {
      title: 'Interesting discussion about databases',
      body: 'no pain keywords here at all just a normal discussion',
      points: 150, num_comments: 80, item_kind: 'story',
    };

    const lowEngagement = {
      title: 'Interesting discussion about databases',
      body: 'no pain keywords here at all just a normal discussion',
      points: 5, num_comments: 3, item_kind: 'story',
    };

    const highResult = passesPainSignal(highEngagement);
    const lowResult = passesPainSignal(lowEngagement);

    const errors = [];
    if (!highResult) errors.push('High engagement (150pts, 80 comments) was rejected');
    if (lowResult) errors.push('Low engagement (5pts, 3 comments) with no pain signal was accepted');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'High engagement bypasses pain check, low engagement without pain rejected');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.6: Deduplication works ──────────────────────────────────────────

function test2_6() {
  const name = '2.6: Deduplication';
  try {
    const dupes = [
      { id: 'a', title: 'Alternative to Notion for note taking', body: '', points: 10, num_comments: 5 },
      { id: 'b', title: 'Alternative to Notion for note taking!', body: '', points: 50, num_comments: 20 },
      { id: 'c', title: 'alternative to notion for note taking', body: '', points: 5, num_comments: 2 },
    ];

    const result = deduplicateItems(dupes);

    const errors = [];
    if (result.length !== 1) errors.push(`Expected 1 survivor, got ${result.length}`);
    if (result[0]?.points !== 50) errors.push(`Survivor has points=${result[0]?.points}, expected 50`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, '1 survivor from 3 dupes, points=50 (highest engagement wins)');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.7: Show HN handling ────────────────────────────────────────────

function test2_7() {
  const name = '2.7: Show HN handling';
  try {
    const showHNlow = { title: 'Show HN: My new tool for developers', num_comments: 10, item_kind: 'story', points: 20 };
    const showHNhigh = { title: 'Show HN: My new tool for developers', num_comments: 50, item_kind: 'story', points: 20 };
    const nonShowHN = { title: 'Regular discussion title', num_comments: 5, item_kind: 'story', points: 20 };

    const errors = [];
    if (passesShowHN(showHNlow) !== false) errors.push('Show HN with 10 comments should be REJECTED');
    if (passesShowHN(showHNhigh) !== true) errors.push('Show HN with 50 comments should SURVIVE');
    if (passesShowHN(nonShowHN) !== true) errors.push('Non-Show HN should always pass');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Show HN <30 comments rejected, >=30 survives, non-Show HN always passes');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 2.8: Spot check filtered results for leaked noise ────────────────

function test2_8() {
  const name = '2.8: Spot check for leaked noise';
  try {
    if (!filterStats || filterStats.filtered.length === 0) {
      return fail(name, 'No filtered results from TEST 2.1');
    }

    const sample = filterStats.filtered.slice(0, 20);
    const errors = [];

    // Check against NOISE_PATTERNS
    for (const item of sample) {
      const text = `${item.title || ''} ${item.body || ''}`;
      for (const pattern of NOISE_PATTERNS) {
        if (pattern.test(text)) {
          errors.push(`Noise leak: "${(item.title || item.id).slice(0, 50)}" matched ${pattern}`);
        }
      }
    }

    // Check for "How to" titles
    for (const item of sample) {
      if (/^how to/i.test(item.title || '')) {
        errors.push(`"How to" title leaked: "${item.title}"`);
      }
    }

    // Check for code blocks in body
    for (const item of sample) {
      if ((item.body || '').includes('```')) {
        errors.push(`Code block leaked in: "${(item.title || item.id).slice(0, 50)}"`);
      }
    }

    if (errors.length > 0) return fail(name, `${errors.length} leaks: ${errors.slice(0, 3).join('; ')}`);
    pass(name, `${sample.length} filtered items checked, 0 noise leaked`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 2: FILTER — Automated Verification Tests ===\n');

await test2_1();
test2_2();
test2_3();
test2_4();
test2_5();
test2_6();
test2_7();
test2_8();

console.log('\n=== SUMMARY ===');
const passed = testResults.filter(Boolean).length;
const total = testResults.length;

if (passed === total) {
  console.log(`STEP 2 PASSED \u2705 \u2014 All ${total} tests passed`);
} else {
  console.log(`STEP 2 FAILED \u274C \u2014 ${passed}/${total} tests passed`);
}

process.exit(passed === total ? 0 : 1);
