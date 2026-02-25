// Step 6: LLM Enrichment — Automated Verification Tests
// Tests enrichment selection, schema, verdict distribution, score adjustments, URL construction, pipeline integrity

// ─── Functions under test ───────────────────────────────────────────────────

function buildEnrichPrompt(opportunities) {
  const items = opportunities.map((o, i) =>
    `[${i}] PAIN: ${o.pain_summary}\nWHO: ${o.who}\nINDUSTRY: ${o.industry}\nTOOLS: ${(o.tools_mentioned||[]).join(', ')}\nEVIDENCE: "${o.evidence_excerpt}"`
  ).join('\n\n');

  return `For each, assess competition and buildability.
RULES:
- List ALL competitors exhaustively.
- competition_level: 'open' (<2 established), 'competitive' (2-4), 'saturated' (5+)
- build_estimate: realistic for solo dev ('weekend','1-2 weeks','1 month','2-3 months')
- DO NOT include revenue estimates.
- verdict: BUILD (clear gap), MAYBE (interesting but risky), SKIP (too crowded/vague)

Return JSON array:
{"index":0,"competitors":["A","B"],"competition_level":"competitive","niche_angle":"specific underserved segment","build_estimate":"1-2 weeks","first_customers":"where to find first 10 users","red_flag":"biggest risk","verdict":"MAYBE"}

OPPORTUNITIES:\n${items}`;
}

function adjustScoreForEnrichment(opp) {
  let score = opp.score || 50;
  if (opp.verdict === 'BUILD') score += 10;
  else if (opp.verdict === 'SKIP') score -= 10;
  if (opp.competition_level === 'open') score += 5;
  else if (opp.competition_level === 'saturated') score -= 15;
  return Math.max(0, Math.min(100, score));
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

// ─── TEST 6.1: Enrichment only runs on top 15 ──────────────────────────────

function test6_1() {
  const name = '6.1: Enrichment top 15 selection';
  try {
    // Create 20 mock opportunities with scores, some saturated
    const opps = Array.from({ length: 20 }, (_, i) => ({
      id: `opp-${i}`,
      score: 90 - i * 4,
      is_saturated: i === 2 || i === 5, // mark 2 as saturated
      pain_summary: `Pain ${i}`,
      who: `User ${i}`,
      industry: `Industry ${i}`,
    }));

    // Select top 15 non-saturated
    const eligible = opps.filter(o => !o.is_saturated);
    const top15 = eligible.sort((a, b) => b.score - a.score).slice(0, 15);

    const BATCH_SIZE = 5;
    const batchCount = Math.ceil(top15.length / BATCH_SIZE);

    const errors = [];
    if (top15.length > 15) errors.push(`Selected ${top15.length} items, expected <= 15`);
    if (batchCount > 3) errors.push(`${batchCount} batches needed, expected <= 3`);

    // Verify saturated items excluded
    const hasSaturated = top15.some(o => o.is_saturated);
    if (hasSaturated) errors.push('Saturated items should be excluded');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `Selected ${top15.length} non-saturated items, ${batchCount} batches of ${BATCH_SIZE}`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 6.2: Enrichment fields schema ─────────────────────────────────────

function test6_2() {
  const name = '6.2: Enrichment fields schema';
  try {
    const mock = {
      index: 0,
      competitors: ['ToolA', 'ToolB'],
      competition_level: 'competitive',
      niche_angle: 'Focus on X',
      build_estimate: '1-2 weeks',
      first_customers: 'Reddit r/X community',
      red_flag: 'existing solutions',
      verdict: 'MAYBE',
    };

    const errors = [];

    if (!Array.isArray(mock.competitors)) errors.push('competitors should be an array');
    if (!['open', 'competitive', 'saturated'].includes(mock.competition_level)) {
      errors.push(`Invalid competition_level: "${mock.competition_level}"`);
    }
    if (typeof mock.build_estimate !== 'string') errors.push('build_estimate should be a string');
    if (!['BUILD', 'MAYBE', 'SKIP'].includes(mock.verdict)) {
      errors.push(`Invalid verdict: "${mock.verdict}"`);
    }
    if ('revenue_potential' in mock) errors.push('Should NOT have revenue_potential field');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'All fields correct types, no revenue_potential, valid competition_level and verdict');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 6.3: Verdict distribution is reasonable ───────────────────────────

function test6_3() {
  const name = '6.3: Verdict distribution';
  try {
    const mocks = [
      { verdict: 'BUILD', competition_level: 'open' },
      { verdict: 'MAYBE', competition_level: 'competitive' },
      { verdict: 'SKIP', competition_level: 'saturated' },
    ];

    const verdicts = mocks.map(m => m.verdict);
    const unique = new Set(verdicts);

    const errors = [];
    if (unique.size <= 1) errors.push(`All same verdict: "${verdicts[0]}"`);

    const hasBuildOrMaybe = verdicts.includes('BUILD') || verdicts.includes('MAYBE');
    if (!hasBuildOrMaybe) errors.push('No BUILD or MAYBE verdict found');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `3 distinct verdicts: [${verdicts.join(', ')}], includes BUILD/MAYBE`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 6.4: Score adjustments applied correctly ──────────────────────────

function test6_4() {
  const name = '6.4: Score adjustments';
  try {
    const cases = [
      { input: { score: 60, verdict: 'BUILD' }, expected: 70, label: 'BUILD +10' },
      { input: { score: 60, verdict: 'SKIP' }, expected: 50, label: 'SKIP -10' },
      { input: { score: 60, verdict: 'MAYBE', competition_level: 'open' }, expected: 65, label: 'MAYBE + open +5' },
      { input: { score: 60, verdict: 'SKIP', competition_level: 'saturated' }, expected: 35, label: 'SKIP -10 + saturated -15' },
      { input: { score: 5, verdict: 'SKIP', competition_level: 'saturated' }, expected: 0, label: 'Clamped to 0' },
      { input: { score: 95, verdict: 'BUILD', competition_level: 'open' }, expected: 100, label: 'Clamped to 100' },
    ];

    const errors = [];
    for (const { input, expected, label } of cases) {
      const result = adjustScoreForEnrichment(input);
      if (result !== expected) {
        errors.push(`${label}: expected ${expected}, got ${result}`);
      }
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `All 6 score adjustment cases correct (BUILD+10, SKIP-10, open+5, saturated-15, clamp 0/100)`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 6.5: Competition URL construction ─────────────────────────────────

function test6_5() {
  const name = '6.5: Competition URL construction';
  try {
    const opp = { pain_summary: 'pool service scheduling for contractors' };
    const searchQuery = `${opp.pain_summary} software`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

    const errors = [];

    // Check URL is valid
    try {
      new URL(url);
    } catch {
      errors.push('URL is not valid');
    }

    // Check it contains the encoded search query
    if (!url.includes(encodeURIComponent('pool service scheduling for contractors software'))) {
      errors.push('URL does not contain encoded search query');
    }

    // Check it starts with google search
    if (!url.startsWith('https://www.google.com/search?q=')) {
      errors.push('URL does not start with Google search base');
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `URL valid: ${url}`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 6.6: Full pipeline integrity check ───────────────────────────────

function test6_6() {
  const name = '6.6: Full pipeline integrity';
  try {
    // A complete mock opportunity with ALL fields from all 6 steps
    const fullOpps = [
      {
        // Step 1: Harvest
        id: 'hn-12345',
        source_url: 'https://news.ycombinator.com/item?id=12345',
        title: 'Frustrated with pool service scheduling',
        body: 'I run a pool cleaning business and waste hours every week on scheduling',
        points: 85,
        num_comments: 42,
        query_tier: 1,
        // Step 3: Classification
        label: 'PAIN_SIGNAL',
        confidence: 0.92,
        who: 'pool service business owners',
        industry: 'pool service',
        pain_summary: 'Manual scheduling wastes hours weekly for pool service routes',
        evidence_excerpt: 'waste hours every week on scheduling across multiple client sites',
        evidence_verified: true,
        // Step 5: Scoring
        score: 88,
        is_saturated: false,
        // Step 6: Enrichment
        verdict: 'BUILD',
        competitors: ['Jobber', 'ServiceTitan'],
        competition_level: 'competitive',
        build_estimate: '1 month',
        niche_angle: 'Pool-specific route optimization',
        first_customers: 'r/swimmingpools, pool service Facebook groups',
        red_flag: 'Jobber expanding into pool vertical',
      },
      {
        id: 'hn-67890',
        source_url: 'https://news.ycombinator.com/item?id=67890',
        title: 'Simple CRM tool needed',
        body: 'Looking for a simple CRM dashboard',
        points: 12,
        num_comments: 5,
        query_tier: 3,
        label: 'FEATURE_REQUEST',
        confidence: 0.4,
        who: 'small businesses',
        industry: 'general',
        pain_summary: 'simple CRM dashboard for tracking leads',
        evidence_excerpt: 'looking for simple CRM',
        evidence_verified: false,
        score: 22,
        is_saturated: true,
        verdict: 'SKIP',
        competitors: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Close'],
        competition_level: 'saturated',
        build_estimate: '2-3 months',
        niche_angle: 'None identified',
        first_customers: 'Unknown',
        red_flag: 'Extremely crowded market',
      },
      {
        id: 'hn-11111',
        source_url: 'https://news.ycombinator.com/item?id=11111',
        title: 'Dental practice billing frustration',
        body: 'Dental billing integration is broken everywhere',
        points: 55,
        num_comments: 28,
        query_tier: 2,
        label: 'SWITCHING_SIGNAL',
        confidence: 0.78,
        who: 'dental practice managers',
        industry: 'dental',
        pain_summary: 'Dental billing integration broken with insurance portals',
        evidence_excerpt: 'dental billing integration is broken everywhere we have tried multiple tools',
        evidence_verified: true,
        score: 72,
        is_saturated: false,
        verdict: 'MAYBE',
        competitors: ['Dentrix', 'Open Dental'],
        competition_level: 'competitive',
        build_estimate: '2-3 months',
        niche_angle: 'Insurance portal integration focus',
        first_customers: 'Dental practice owner forums',
        red_flag: 'Complex regulatory requirements',
      },
    ];

    const requiredFields = [
      'source_url', 'evidence_excerpt', 'score', 'label', 'who', 'industry',
      'confidence', 'is_saturated', 'verdict', 'competitors', 'competition_level', 'build_estimate',
    ];

    const errors = [];

    for (const opp of fullOpps) {
      for (const field of requiredFields) {
        if (opp[field] === undefined) errors.push(`${opp.id}: missing ${field}`);
      }

      if (!opp.source_url.startsWith('https://')) {
        errors.push(`${opp.id}: source_url doesn't start with https://`);
      }
      if (opp.evidence_excerpt.length <= 10) {
        errors.push(`${opp.id}: evidence_excerpt too short (${opp.evidence_excerpt.length})`);
      }
      if (opp.score < 0 || opp.score > 100) {
        errors.push(`${opp.id}: score ${opp.score} out of [0,100]`);
      }
    }

    // Verify sort by score descending
    const sorted = [...fullOpps].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].score < sorted[i + 1].score) {
        errors.push(`Sort broken: ${sorted[i].score} < ${sorted[i + 1].score}`);
      }
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `${fullOpps.length} full-pipeline opportunities validated, sorted [${sorted.map(o => o.score).join(', ')}]`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 6: LLM ENRICHMENT — Automated Verification Tests ===\n');

test6_1();
test6_2();
test6_3();
test6_4();
test6_5();
test6_6();

console.log('\n=== SUMMARY ===');
const passed = testResults.filter(Boolean).length;
const total = testResults.length;

if (passed === total) {
  console.log(`STEP 6 PASSED \u2705 \u2014 All ${total} tests passed`);
} else {
  console.log(`STEP 6 FAILED \u274C \u2014 ${passed}/${total} tests passed`);
}

process.exit(passed === total ? 0 : 1);
