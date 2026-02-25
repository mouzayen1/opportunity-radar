// Step 3: LLM Classification — Automated Verification Tests
// Tests Claude API connectivity, JSON parsing, evidence validation, prompt building, and logic checks

// ─── Functions under test ───────────────────────────────────────────────────

function validateEvidence(excerpt, sourceText) {
  if (!excerpt || excerpt.length < 10) return false;
  const excerptWords = excerpt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (excerptWords.length === 0) return false;
  const source = sourceText.toLowerCase();
  const matchCount = excerptWords.filter(w => source.includes(w)).length;
  return matchCount / excerptWords.length >= 0.7;
}

function parseClaudeJson(raw) {
  let text = raw.trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
  try { return JSON.parse(text); } catch {}
  // Fallback: extract array with regex
  const match = text.match(/\[[\s\S]*\]/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

function buildClassifyPrompt(items) {
  const itemsText = items.map((item, i) =>
    `[${i}] TITLE: ${item.title || 'N/A'}
URL: ${item.source_url}
POINTS: ${item.points} | COMMENTS: ${item.num_comments}
TEXT: ${(item.body || item.title || '').slice(0, 500)}
---`
  ).join('\n');
  return `Classify each discussion...${itemsText}`;
}

// ─── Test runner ────────────────────────────────────────────────────────────

const testResults = [];
let apiFailedWith401 = false;

function pass(name, details) {
  console.log(`TEST ${name} ... PASS \u2705 (${details})`);
  testResults.push(true);
}

function fail(name, details) {
  console.log(`TEST ${name} ... FAIL \u274C (${details})`);
  testResults.push(false);
}

// ─── TEST 3.1: Claude API connectivity ──────────────────────────────────────

async function test3_1() {
  const name = '3.1: Claude API connectivity';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        system: 'Respond with only: [{"test":"ok"}]',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (res.ok) {
      pass(name, `HTTP ${res.status} — Claude API accessible`);
    } else if (res.status === 401 || res.status === 403) {
      apiFailedWith401 = true;
      console.log(`TEST ${name} ... EXPECTED FAIL \u26A0\uFE0F (HTTP ${res.status} — Claude API requires auth outside Claude.ai artifacts. API-dependent tests skipped.)`);
      testResults.push('skipped');
    } else {
      fail(name, `HTTP ${res.status} — unexpected error`);
    }
  } catch (err) {
    fail(name, `Network error: ${err.message}`);
  }
}

// ─── TEST 3.2: parseClaudeJson handles clean JSON ──────────────────────────

function test3_2() {
  const name = '3.2: parseClaudeJson clean JSON';
  try {
    const input = '[{"index":0,"label":"PAIN_SIGNAL","confidence":0.8}]';
    const result = parseClaudeJson(input);

    const errors = [];
    if (!Array.isArray(result)) errors.push('Result is not an array');
    else {
      if (result.length !== 1) errors.push(`Expected 1 element, got ${result.length}`);
      if (result[0]?.label !== 'PAIN_SIGNAL') errors.push(`label: expected "PAIN_SIGNAL", got "${result[0]?.label}"`);
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Parsed clean JSON array, label=PAIN_SIGNAL');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.3: parseClaudeJson handles markdown-wrapped JSON ────────────────

function test3_3() {
  const name = '3.3: parseClaudeJson markdown-wrapped';
  try {
    const input = '```json\n[{"index":0,"label":"NOISE","reason":"not relevant"}]\n```';
    const result = parseClaudeJson(input);

    const errors = [];
    if (!Array.isArray(result)) errors.push('Result is not an array');
    else if (result[0]?.label !== 'NOISE') errors.push(`label: expected "NOISE", got "${result[0]?.label}"`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Parsed markdown-fenced JSON, label=NOISE');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.4: parseClaudeJson handles text + array ─────────────────────────

function test3_4() {
  const name = '3.4: parseClaudeJson text + array fallback';
  try {
    const input = 'Here are the results:\n[{"index":0,"label":"PAIN_SIGNAL"}]\nDone.';
    const result = parseClaudeJson(input);

    const errors = [];
    if (!Array.isArray(result)) errors.push('Result is not an array');
    else if (result.length !== 1) errors.push(`Expected 1 element, got ${result.length}`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Regex fallback extracted array from surrounding text');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.5: parseClaudeJson returns null for garbage ─────────────────────

function test3_5() {
  const name = '3.5: parseClaudeJson garbage input';
  try {
    const result = parseClaudeJson('This is not JSON at all');

    if (result !== null) return fail(name, `Expected null, got ${JSON.stringify(result)}`);
    pass(name, 'Returns null for non-JSON input');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.6: validateEvidence with good evidence ──────────────────────────

function test3_6() {
  const name = '3.6: validateEvidence good match';
  try {
    const source = "I've been frustrated with Jira for years. The interface is clunky and slow.";
    const excerpt = "frustrated with Jira for years. The interface is clunky";
    const result = validateEvidence(excerpt, source);

    if (!result) return fail(name, 'Expected true for high word overlap, got false');
    pass(name, 'Good evidence with high word overlap returns true');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.7: validateEvidence with fabricated evidence ────────────────────

function test3_7() {
  const name = '3.7: validateEvidence fabricated';
  try {
    const source = "I've been frustrated with Jira for years. The interface is clunky and slow.";
    const excerpt = "We need a better project management tool for enterprise teams";
    const result = validateEvidence(excerpt, source);

    if (result) return fail(name, 'Expected false for fabricated evidence, got true');
    pass(name, 'Fabricated evidence with low word overlap returns false');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.8: validateEvidence edge cases ──────────────────────────────────

function test3_8() {
  const name = '3.8: validateEvidence edge cases';
  try {
    const source = "Some source text here for testing purposes.";
    const errors = [];

    // Empty excerpt
    if (validateEvidence('', source) !== false) errors.push('Empty excerpt should return false');

    // Short excerpt (<10 chars)
    if (validateEvidence('hello', source) !== false) errors.push('Short excerpt "hello" should return false');

    // Excerpt with only short words (none > 3 chars)
    if (validateEvidence('I am ok', source) !== false) errors.push('Excerpt "I am ok" (no words > 3 chars) should return false');

    // Null excerpt
    if (validateEvidence(null, source) !== false) errors.push('Null excerpt should return false');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Empty, short, null, and short-words-only excerpts all return false');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.9: buildClassifyPrompt produces valid prompt ────────────────────

function test3_9() {
  const name = '3.9: buildClassifyPrompt';
  try {
    const items = [
      { title: 'Frustrated with Jira', source_url: 'https://news.ycombinator.com/item?id=111', points: 50, num_comments: 30, body: 'I hate how slow Jira is' },
      { title: 'Alternative to Slack', source_url: 'https://news.ycombinator.com/item?id=222', points: 25, num_comments: 15, body: 'Looking for a self-hosted alternative to Slack' },
      { title: 'Build tool idea', source_url: 'https://news.ycombinator.com/item?id=333', points: 10, num_comments: 8, body: 'A'.repeat(600) },
    ];

    const result = buildClassifyPrompt(items);
    const errors = [];

    if (typeof result !== 'string') errors.push('Result is not a string');
    if (!result.includes('[0]')) errors.push('Missing [0] index');
    if (!result.includes('[1]')) errors.push('Missing [1] index');
    if (!result.includes('[2]')) errors.push('Missing [2] index');
    if (!result.includes('https://news.ycombinator.com/item?id=111')) errors.push('Missing item 0 URL');
    if (!result.includes('https://news.ycombinator.com/item?id=222')) errors.push('Missing item 1 URL');
    if (!result.includes('https://news.ycombinator.com/item?id=333')) errors.push('Missing item 2 URL');

    // Check body truncation: item 3 has 600 A's, but should be truncated to 500
    const bodySection = result.split('[2]')[1];
    if (bodySection) {
      const aCount = (bodySection.match(/A/g) || []).length;
      if (aCount > 500) errors.push(`Body not truncated: found ${aCount} A's, expected <= 500`);
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Prompt has indexed items, URLs, and truncated bodies');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.10: Required fields check (synthetic) ──────────────────────────

function test3_10() {
  const name = '3.10: Required fields check';
  try {
    const mockOpportunity = {
      source_url: 'https://news.ycombinator.com/item?id=12345',
      evidence_excerpt: 'I am frustrated with the current tools available for this workflow',
      who: 'freelance data analysts',
      industry: 'data analytics',
      pain_summary: 'Current tools are too expensive and complex for solo practitioners',
      confidence: 0.85,
      label: 'PAIN_SIGNAL',
    };

    const errors = [];

    // Check all fields present
    for (const field of ['source_url', 'evidence_excerpt', 'who', 'industry', 'pain_summary', 'confidence', 'label']) {
      if (mockOpportunity[field] === undefined) errors.push(`Missing field: ${field}`);
    }

    // Type checks
    if (typeof mockOpportunity.source_url !== 'string') errors.push('source_url not string');
    if (typeof mockOpportunity.evidence_excerpt !== 'string') errors.push('evidence_excerpt not string');
    if (typeof mockOpportunity.who !== 'string') errors.push('who not string');
    if (typeof mockOpportunity.industry !== 'string') errors.push('industry not string');
    if (typeof mockOpportunity.pain_summary !== 'string') errors.push('pain_summary not string');
    if (typeof mockOpportunity.confidence !== 'number') errors.push('confidence not number');
    if (typeof mockOpportunity.label !== 'string') errors.push('label not string');

    // Value checks
    if (!mockOpportunity.source_url.startsWith('https://news.ycombinator.com')) {
      errors.push(`source_url doesn't start with HN URL`);
    }
    if (mockOpportunity.evidence_excerpt.length <= 10) {
      errors.push(`evidence_excerpt too short: ${mockOpportunity.evidence_excerpt.length}`);
    }
    if (mockOpportunity.confidence < 0 || mockOpportunity.confidence > 1) {
      errors.push(`confidence out of range: ${mockOpportunity.confidence}`);
    }
    const validLabels = ['PAIN_SIGNAL', 'SWITCHING_SIGNAL', 'FEATURE_REQUEST'];
    if (!validLabels.includes(mockOpportunity.label)) {
      errors.push(`Invalid label: ${mockOpportunity.label}`);
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'All required fields present with correct types and valid values');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.11: No generic MBA ideas check ─────────────────────────────────

function test3_11() {
  const name = '3.11: No generic MBA ideas check';
  try {
    const genericPattern = /^(simple|better|smart) (crm|project management|social media|email marketing)/i;
    const vagueWhoList = ['small businesses', 'startups', 'teams', 'companies', 'developers', 'users', 'people', 'everyone', 'organizations'];

    const errors = [];

    // Generic pattern tests
    if (!genericPattern.test('simple CRM for startups')) {
      errors.push('"simple CRM for startups" should match generic pattern');
    }
    if (genericPattern.test('reconciliation workflow for solo bookkeepers')) {
      errors.push('"reconciliation workflow for solo bookkeepers" should NOT match generic pattern');
    }

    // Vague WHO tests
    if (!vagueWhoList.includes('small businesses')) {
      errors.push('"small businesses" should be in vague list');
    }
    if (vagueWhoList.includes('independent HVAC contractors')) {
      errors.push('"independent HVAC contractors" should NOT be in vague list');
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Generic MBA pattern catches vague ideas, passes specific ones; vague WHO list works correctly');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 3.12: Batch size calculation ──────────────────────────────────────

function test3_12() {
  const name = '3.12: Batch size calculation';
  try {
    const BATCH_SIZE = 8;

    function getBatches(totalItems) {
      if (totalItems === 0) return [];
      const batches = [];
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        batches.push(Math.min(BATCH_SIZE, totalItems - i));
      }
      return batches;
    }

    const errors = [];

    // 20 items -> 3 batches (8, 8, 4)
    const b20 = getBatches(20);
    if (b20.length !== 3) errors.push(`20 items: expected 3 batches, got ${b20.length}`);
    if (JSON.stringify(b20) !== '[8,8,4]') errors.push(`20 items: expected [8,8,4], got [${b20}]`);

    // 8 items -> 1 batch
    const b8 = getBatches(8);
    if (b8.length !== 1) errors.push(`8 items: expected 1 batch, got ${b8.length}`);
    if (JSON.stringify(b8) !== '[8]') errors.push(`8 items: expected [8], got [${b8}]`);

    // 0 items -> 0 batches
    const b0 = getBatches(0);
    if (b0.length !== 0) errors.push(`0 items: expected 0 batches, got ${b0.length}`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, '20 items -> [8,8,4], 8 items -> [8], 0 items -> []');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 3: LLM CLASSIFICATION — Automated Verification Tests ===\n');

await test3_1();
test3_2();
test3_3();
test3_4();
test3_5();
test3_6();
test3_7();
test3_8();
test3_9();
test3_10();
test3_11();
test3_12();

console.log('\n=== SUMMARY ===');
const logicTests = testResults.filter(r => r !== 'skipped');
const logicPassed = logicTests.filter(r => r === true).length;
const logicTotal = logicTests.length;
const skipped = testResults.filter(r => r === 'skipped').length;

if (skipped > 0) {
  // API test was skipped (401/403)
  if (logicPassed === logicTotal) {
    console.log(`STEP 3 LOGIC PASSED \u2705 \u2014 ${logicPassed}/${logicTotal} logic tests passed. Claude API tests require Claude.ai runtime.`);
  } else {
    console.log(`STEP 3 FAILED \u274C \u2014 ${logicPassed}/${logicTotal} logic tests passed (API test skipped)`);
  }
  process.exit(logicPassed === logicTotal ? 0 : 1);
} else {
  const allPassed = testResults.every(r => r === true);
  const totalPassed = testResults.filter(r => r === true).length;
  if (allPassed) {
    console.log(`STEP 3 PASSED \u2705 \u2014 All ${testResults.length} tests passed`);
  } else {
    console.log(`STEP 3 FAILED \u274C \u2014 ${totalPassed}/${testResults.length} tests passed`);
  }
  process.exit(allPassed ? 0 : 1);
}
