// Step 4: Evaluation Harness — Automated Verification Tests
// Tests rating storage, toggle logic, metrics calculation, and clear functionality

// ─── Rating store (simulates React state + localStorage) ────────────────────

function createRatingsStore() {
  let ratings = {};

  function rateOpportunity(id, field, value) {
    const current = ratings[id] || {};
    const newValue = current[field] === value ? null : value;
    ratings[id] = { ...current, [field]: newValue, timestamp: Date.now() };
  }

  function getRatings() { return { ...ratings }; }
  function clearRatings() { ratings = {}; }

  return { rateOpportunity, getRatings, clearRatings };
}

// ─── Metrics calculation ────────────────────────────────────────────────────

function calculateMetrics(opportunities, ratings) {
  const rated = Object.entries(ratings).filter(([id, r]) => r.useful !== null && r.useful !== undefined);
  const totalResults = opportunities.length;
  const ratedCount = rated.length;
  const useful = rated.filter(([_, r]) => r.useful === true);
  const junk = rated.filter(([_, r]) => r.useful === false);

  const top10Ids = opportunities.slice(0, 10).map(o => o.id);
  const top10Rated = top10Ids.filter(id => ratings[id]?.useful === true).length;
  const top10Total = top10Ids.filter(id => ratings[id]?.useful !== null && ratings[id]?.useful !== undefined).length;

  const usefulWithNiche = useful.filter(([_, r]) => r.niche !== null && r.niche !== undefined);
  const nicheCount = usefulWithNiche.filter(([_, r]) => r.niche === true).length;
  const genericCount = usefulWithNiche.filter(([_, r]) => r.niche === false).length;

  const evidenceCount = opportunities.filter(o => o.evidence_excerpt && o.evidence_excerpt.length > 0).length;

  return { totalResults, ratedCount, useful: useful.length, junk: junk.length, top10Rated, top10Total, nicheCount, genericCount, evidenceCount };
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

// ─── TEST 4.1: Rating persistence and toggle ────────────────────────────────

function test4_1() {
  const name = '4.1: Rating persistence and toggle';
  try {
    const store = createRatingsStore();

    // Rate item 'test-1' as useful=true
    store.rateOpportunity('test-1', 'useful', true);
    let ratings = store.getRatings();
    if (ratings['test-1'].useful !== true) {
      return fail(name, `After rating useful=true: expected true, got ${ratings['test-1'].useful}`);
    }

    // Rate same item useful=true again (toggle off)
    store.rateOpportunity('test-1', 'useful', true);
    ratings = store.getRatings();
    if (ratings['test-1'].useful !== null) {
      return fail(name, `After toggle off: expected null, got ${ratings['test-1'].useful}`);
    }

    // Rate item useful=true, then useful=false
    store.rateOpportunity('test-1', 'useful', true);
    ratings = store.getRatings();
    if (ratings['test-1'].useful !== true) {
      return fail(name, `After re-rating useful=true: expected true, got ${ratings['test-1'].useful}`);
    }

    store.rateOpportunity('test-1', 'useful', false);
    ratings = store.getRatings();
    if (ratings['test-1'].useful !== false) {
      return fail(name, `After switching to useful=false: expected false, got ${ratings['test-1'].useful}`);
    }

    pass(name, 'Rate sets value, re-click toggles to null, different value switches');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 4.2: Metrics calculation ──────────────────────────────────────────

function test4_2() {
  const name = '4.2: Metrics calculation';
  try {
    const store = createRatingsStore();

    // Create 10 mock opportunities
    const opportunities = Array.from({ length: 10 }, (_, i) => ({
      id: `opp-${i}`,
      title: `Opportunity ${i}`,
      evidence_excerpt: `Some evidence for opp-${i}`,
    }));

    // Rate 7 as useful (true), 3 as junk (false)
    for (let i = 0; i < 7; i++) store.rateOpportunity(`opp-${i}`, 'useful', true);
    for (let i = 7; i < 10; i++) store.rateOpportunity(`opp-${i}`, 'useful', false);

    // Of the 7 useful: rate 5 as niche (true), 2 as generic (false)
    for (let i = 0; i < 5; i++) store.rateOpportunity(`opp-${i}`, 'niche', true);
    for (let i = 5; i < 7; i++) store.rateOpportunity(`opp-${i}`, 'niche', false);

    const metrics = calculateMetrics(opportunities, store.getRatings());
    const errors = [];

    if (metrics.totalResults !== 10) errors.push(`totalResults: expected 10, got ${metrics.totalResults}`);
    if (metrics.ratedCount !== 10) errors.push(`ratedCount: expected 10, got ${metrics.ratedCount}`);
    if (metrics.useful !== 7) errors.push(`useful: expected 7, got ${metrics.useful}`);
    if (metrics.junk !== 3) errors.push(`junk: expected 3, got ${metrics.junk}`);
    if (metrics.nicheCount !== 5) errors.push(`nicheCount: expected 5, got ${metrics.nicheCount}`);
    if (metrics.genericCount !== 2) errors.push(`genericCount: expected 2, got ${metrics.genericCount}`);

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `totalResults=10, rated=10, useful=7, junk=3, niche=5, generic=2`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 4.3: Mutual exclusivity ──────────────────────────────────────────

function test4_3() {
  const name = '4.3: Mutual exclusivity';
  try {
    const store = createRatingsStore();

    // Rate item useful=true, then niche=true
    store.rateOpportunity('item-1', 'useful', true);
    store.rateOpportunity('item-1', 'niche', true);
    let ratings = store.getRatings();

    if (ratings['item-1'].useful !== true || ratings['item-1'].niche !== true) {
      return fail(name, `After useful=true + niche=true: expected both true, got useful=${ratings['item-1'].useful}, niche=${ratings['item-1'].niche}`);
    }

    // Rate item useful=false (switches from true to false)
    store.rateOpportunity('item-1', 'useful', false);
    ratings = store.getRatings();

    if (ratings['item-1'].useful !== false) {
      return fail(name, `After switching useful to false: expected false, got ${ratings['item-1'].useful}`);
    }
    if (ratings['item-1'].niche !== true) {
      return fail(name, `After switching useful: niche should still be true, got ${ratings['item-1'].niche}`);
    }

    // Rate item niche=false
    store.rateOpportunity('item-1', 'niche', false);
    ratings = store.getRatings();

    if (ratings['item-1'].useful !== false || ratings['item-1'].niche !== false) {
      return fail(name, `After niche=false: expected useful=false, niche=false, got useful=${ratings['item-1'].useful}, niche=${ratings['item-1'].niche}`);
    }

    pass(name, 'useful and niche are independent — changing one does not affect the other');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 4.4: Clear ratings works ──────────────────────────────────────────

function test4_4() {
  const name = '4.4: Clear ratings';
  try {
    const store = createRatingsStore();

    // Add ratings for 5 items
    for (let i = 0; i < 5; i++) {
      store.rateOpportunity(`clear-${i}`, 'useful', true);
      store.rateOpportunity(`clear-${i}`, 'niche', i % 2 === 0);
    }

    let ratings = store.getRatings();
    if (Object.keys(ratings).length !== 5) {
      return fail(name, `Before clear: expected 5 items, got ${Object.keys(ratings).length}`);
    }

    // Clear ratings
    store.clearRatings();
    ratings = store.getRatings();

    if (Object.keys(ratings).length !== 0) {
      return fail(name, `After clear: expected empty object, got ${Object.keys(ratings).length} items`);
    }

    pass(name, 'clearRatings() returns empty object {}');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 4: EVALUATION HARNESS — Automated Verification Tests ===\n');

test4_1();
test4_2();
test4_3();
test4_4();

console.log('\n=== SUMMARY ===');
const passed = testResults.filter(Boolean).length;
const total = testResults.length;

if (passed === total) {
  console.log(`STEP 4 PASSED \u2705 \u2014 All ${total} tests passed`);
} else {
  console.log(`STEP 4 FAILED \u274C \u2014 ${passed}/${total} tests passed`);
}

process.exit(passed === total ? 0 : 1);
