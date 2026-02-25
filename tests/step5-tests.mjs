// Step 5: Scoring & Saturated Market Blocklist — Automated Verification Tests
// Tests scoring distribution, saturated market detection, generic penalty, niche bonus, sort order, bounds

// ─── Saturated markets blocklist ────────────────────────────────────────────

const SATURATED_MARKETS = {
  "project management": ["Asana","Trello","Monday","Linear","ClickUp","Notion","Basecamp"],
  "crm": ["Salesforce","HubSpot","Pipedrive","Zoho","Close","Freshsales"],
  "email marketing": ["Mailchimp","ConvertKit","Beehiiv","ActiveCampaign","Brevo"],
  "social media scheduling": ["Buffer","Hootsuite","Later","Sprout Social"],
  "website builder": ["Squarespace","Wix","Webflow","Framer","Carrd","WordPress"],
  "form builder": ["Typeform","JotForm","Tally","Google Forms"],
  "invoicing": ["FreshBooks","Wave","Zoho Invoice","Harvest"],
  "password manager": ["1Password","Bitwarden","LastPass","Dashlane"],
  "note taking": ["Notion","Obsidian","Roam","Logseq","Bear"],
  "time tracking": ["Toggl","Clockify","Harvest","RescueTime"],
  "chatbot support": ["Intercom","Drift","Zendesk","Freshdesk","Crisp"],
  "video conferencing": ["Zoom","Teams","Meet","Webex"],
  "file storage": ["Dropbox","Google Drive","OneDrive","Box"],
  "analytics dashboard": ["Google Analytics","Mixpanel","Amplitude","PostHog","Plausible"],
  "design tool": ["Figma","Canva","Adobe","Sketch"],
  "code editor": ["VS Code","JetBrains","Cursor","Zed"],
  "ci cd": ["GitHub Actions","GitLab CI","Jenkins","CircleCI"],
  "landing page": ["Unbounce","Leadpages","Instapage","Carrd"],
  "uptime monitoring": ["UptimeRobot","Pingdom","BetterUptime"],
  "api testing": ["Postman","Insomnia","Hoppscotch","Bruno"],
};

function checkSaturated(opp) {
  const text = `${opp.title || ''} ${opp.pain_summary || ''} ${(opp.tools_mentioned||[]).join(' ')}`.toLowerCase();
  for (const [market, competitors] of Object.entries(SATURATED_MARKETS)) {
    const marketWords = market.split(' ');
    const matchesMarket = marketWords.every(w => text.includes(w));
    const matchesCompetitors = competitors.filter(c => text.toLowerCase().includes(c.toLowerCase())).length >= 2;
    if (matchesMarket || matchesCompetitors) {
      return { is_saturated: true, market_category: market, known_competitors: competitors };
    }
  }
  return { is_saturated: false };
}

function scoreOpportunity(opp) {
  let score = 0;
  const engagement = (opp.points || 0) + (opp.num_comments || 0);
  if (engagement >= 150) score += 25;
  else if (engagement >= 80) score += 20;
  else if (engagement >= 40) score += 15;
  else if (engagement >= 15) score += 10;
  else score += 5;

  score += Math.round((opp.confidence || 0.5) * 20);

  const NICHE = /\b(veterinary|dental|hvac|plumbing|landscaping|auto.?detailing|property.?management|bookkeeping|tattoo|martial.?arts|cleaning.?service|pest.?control|pool.?service|photography|tutoring|restaurant|salon|gym|daycare|construction|trucking|legal|accounting|medical|insurance|mortgage|real.?estate)\b/i;
  const text = `${opp.who || ''} ${opp.industry || ''} ${opp.workflow || ''}`;
  if (NICHE.test(text)) score += 20;
  else if (opp.industry && opp.industry !== 'cross-industry' && opp.industry !== 'general') score += 12;
  else score += 4;

  if (opp.evidence_excerpt?.length > 30) score += 8;
  if (opp.evidence_verified !== false) score += 4;
  if (opp.source_url) score += 4;
  if ((opp.num_comments || 0) >= 20) score += 4;

  if (opp.label === 'PAIN_SIGNAL') score += 10;
  else if (opp.label === 'SWITCHING_SIGNAL') score += 8;
  else score += 5;

  if (opp.query_tier === 1) score += 5;
  else if (opp.query_tier === 2) score += 3;
  else score += 1;

  const GENERIC = /\b(simple|better|smart|automated|ai[- ]powered)\b.{0,15}\b(crm|dashboard|analytics|calendar|scheduler|tracker|manager|tool)\b/i;
  if (GENERIC.test(opp.pain_summary || opp.title)) score -= 15;
  if (opp.is_saturated) score -= 25;
  if ((opp.confidence || 0) < 0.4) score -= 5;
  if (opp.evidence_verified === false) score -= 5;

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

// ─── TEST 5.1: Scoring produces meaningful distribution ─────────────────────

function test5_1() {
  const name = '5.1: Scoring distribution';
  try {
    const mocks = [
      { points: 200, num_comments: 60, confidence: 0.95, industry: 'hvac', who: 'HVAC contractors', label: 'PAIN_SIGNAL', query_tier: 1, evidence_excerpt: 'frustrated with scheduling across multiple jobs daily', evidence_verified: true, source_url: 'https://hn.com/1' },
      { points: 100, num_comments: 40, confidence: 0.8, industry: 'dental', who: 'dental offices', label: 'SWITCHING_SIGNAL', query_tier: 1, evidence_excerpt: 'switching from dentrix to something modern', evidence_verified: true, source_url: 'https://hn.com/2' },
      { points: 50, num_comments: 20, confidence: 0.7, industry: 'logistics', who: 'freight brokers', label: 'PAIN_SIGNAL', query_tier: 2, evidence_excerpt: 'waste of time doing this manually every week', evidence_verified: true, source_url: 'https://hn.com/3' },
      { points: 30, num_comments: 15, confidence: 0.6, industry: 'photography', who: 'photographers', label: 'FEATURE_REQUEST', query_tier: 2, evidence_excerpt: 'need better client gallery sharing tool', evidence_verified: true, source_url: 'https://hn.com/4' },
      { points: 20, num_comments: 10, confidence: 0.5, industry: 'general', who: 'teams', label: 'PAIN_SIGNAL', query_tier: 3, evidence_excerpt: 'some evidence here for testing purposes ok', source_url: 'https://hn.com/5' },
      { points: 10, num_comments: 5, confidence: 0.4, industry: 'cross-industry', who: 'developers', label: 'FEATURE_REQUEST', query_tier: 3, evidence_excerpt: 'short evidence', source_url: 'https://hn.com/6' },
      { points: 5, num_comments: 2, confidence: 0.3, industry: 'general', label: 'FEATURE_REQUEST', query_tier: 3, evidence_verified: false },
      { points: 80, num_comments: 30, confidence: 0.85, industry: 'construction', who: 'general contractors', label: 'PAIN_SIGNAL', query_tier: 1, evidence_excerpt: 'spending hours every week on manual takeoffs', evidence_verified: true, source_url: 'https://hn.com/8' },
      { points: 15, num_comments: 8, confidence: 0.55, industry: 'general', who: 'startups', label: 'SWITCHING_SIGNAL', query_tier: 2, pain_summary: 'simple CRM dashboard', evidence_excerpt: 'some evidence text here for testing it', source_url: 'https://hn.com/9' },
      { points: 3, num_comments: 1, confidence: 0.2, industry: 'general', is_saturated: true, label: 'FEATURE_REQUEST', query_tier: 3, evidence_verified: false },
    ];

    const scores = mocks.map(m => scoreOpportunity(m));
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const mean = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

    console.log(`  (Scores: [${scores.join(', ')}])`);
    console.log(`  (Min: ${min}, Max: ${max}, Median: ${median}, Mean: ${mean})`);

    const errors = [];
    if (max - min < 20) errors.push(`Spread too small: max(${max}) - min(${min}) = ${max - min}, need >= 20`);

    const allWithin10 = max - min <= 10;
    if (allWithin10) errors.push('All scores within 10-point range -- no meaningful differentiation');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `Min=${min}, Max=${max}, Median=${median}, Mean=${mean}, Spread=${max - min}`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 5.2: Saturated detection works ────────────────────────────────────

function test5_2() {
  const name = '5.2: Saturated detection';
  try {
    // Saturated: project management with competitors
    const saturated = checkSaturated({
      title: 'Better project management tool',
      pain_summary: 'need better project management tool',
      tools_mentioned: ['Trello', 'Asana'],
    });

    // Not saturated: niche pool service
    const notSaturated = checkSaturated({
      title: 'Pool service scheduling',
      pain_summary: 'pool service scheduling for contractors',
      tools_mentioned: ['Google Calendar'],
    });

    const errors = [];
    if (!saturated.is_saturated) errors.push('Project management tool should be flagged as saturated');
    if (saturated.market_category !== 'project management') errors.push(`Expected market_category "project management", got "${saturated.market_category}"`);
    if (notSaturated.is_saturated) errors.push('Pool service scheduling should NOT be flagged as saturated');

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, 'Project management detected as saturated, pool service is not');
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 5.3: Generic penalty fires ────────────────────────────────────────

function test5_3() {
  const name = '5.3: Generic penalty';
  try {
    const genericOpp = {
      pain_summary: 'simple CRM dashboard for small businesses',
      points: 20, num_comments: 10, confidence: 0.8,
      label: 'PAIN_SIGNAL', query_tier: 1, industry: 'general',
      evidence_excerpt: 'some evidence text here for testing',
      source_url: 'https://example.com', evidence_verified: true,
    };

    const nicheOpp = {
      pain_summary: 'reconciliation workflow for solo bookkeepers using QuickBooks Desktop',
      points: 20, num_comments: 10, confidence: 0.8,
      label: 'PAIN_SIGNAL', query_tier: 1,
      who: 'solo bookkeepers', industry: 'bookkeeping',
      evidence_excerpt: 'some evidence text here for testing',
      source_url: 'https://example.com', evidence_verified: true,
    };

    const genericScore = scoreOpportunity(genericOpp);
    const nicheScore = scoreOpportunity(nicheOpp);

    console.log(`  (Generic score: ${genericScore}, Niche score: ${nicheScore})`);

    if (nicheScore <= genericScore) {
      return fail(name, `Niche score (${nicheScore}) should be > generic score (${genericScore})`);
    }

    pass(name, `Niche(${nicheScore}) > Generic(${genericScore}), difference=${nicheScore - genericScore}`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 5.4: Niche bonus works ───────────────────────────────────────────

function test5_4() {
  const name = '5.4: Niche bonus';
  try {
    // Both items share same base attributes, only differ in who/industry/workflow
    const base = {
      points: 30, num_comments: 15, confidence: 0.7,
      label: 'PAIN_SIGNAL', query_tier: 2,
      evidence_excerpt: 'some longer evidence text here for testing purposes',
      source_url: 'https://example.com', evidence_verified: true,
    };

    const nicheItem = { ...base, who: 'independent HVAC contractors', industry: 'HVAC', workflow: 'scheduling' };
    const genericItem = { ...base, who: 'businesses', industry: 'general', workflow: 'management' };

    const nicheScore = scoreOpportunity(nicheItem);
    const genericScore = scoreOpportunity(genericItem);

    console.log(`  (HVAC niche score: ${nicheScore}, General score: ${genericScore})`);

    // HVAC gets NICHE bonus of 20, general gets 4 -- difference should be 16
    if (nicheScore <= genericScore) {
      return fail(name, `HVAC score (${nicheScore}) should be > general score (${genericScore})`);
    }

    const diff = nicheScore - genericScore;
    if (diff !== 16) {
      return fail(name, `Expected 16-point difference (NICHE 20 vs general 4), got ${diff}`);
    }

    pass(name, `HVAC(${nicheScore}) > General(${genericScore}), +16 niche bonus confirmed`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 5.5: Sort order is correct ────────────────────────────────────────

function test5_5() {
  const name = '5.5: Sort order';
  try {
    const items = [
      { points: 200, num_comments: 60, confidence: 0.95, industry: 'hvac', who: 'HVAC contractors', label: 'PAIN_SIGNAL', query_tier: 1, evidence_excerpt: 'frustrated with scheduling across multiple jobs', evidence_verified: true, source_url: 'https://hn.com/1' },
      { points: 5, num_comments: 2, confidence: 0.3, industry: 'general', label: 'FEATURE_REQUEST', query_tier: 3, evidence_verified: false },
      { points: 50, num_comments: 25, confidence: 0.7, industry: 'dental', who: 'dental clinics', label: 'SWITCHING_SIGNAL', query_tier: 2, evidence_excerpt: 'looking for alternative to old dental software', evidence_verified: true, source_url: 'https://hn.com/3' },
      { points: 100, num_comments: 40, confidence: 0.85, industry: 'construction', who: 'general contractors', label: 'PAIN_SIGNAL', query_tier: 1, evidence_excerpt: 'spending hours each week on manual cost estimates', evidence_verified: true, source_url: 'https://hn.com/4' },
      { points: 15, num_comments: 8, confidence: 0.5, industry: 'general', label: 'FEATURE_REQUEST', query_tier: 3, evidence_excerpt: 'some evidence text here for the test', source_url: 'https://hn.com/5' },
    ];

    const scored = items.map(item => ({ ...item, score: scoreOpportunity(item) }));
    scored.sort((a, b) => b.score - a.score);

    console.log(`  (Sorted scores: [${scored.map(s => s.score).join(', ')}])`);

    for (let i = 0; i < scored.length - 1; i++) {
      if (scored[i].score < scored[i + 1].score) {
        return fail(name, `Sort broken at index ${i}: ${scored[i].score} < ${scored[i + 1].score}`);
      }
    }

    pass(name, `Descending order verified: [${scored.map(s => s.score).join(', ')}]`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── TEST 5.6: Score bounds ─────────────────────────────────────────────────

function test5_6() {
  const name = '5.6: Score bounds';
  try {
    // Max possible: high engagement, high confidence, niche, good evidence, pain signal, tier 1
    const maxItem = {
      points: 300, num_comments: 100, confidence: 1.0,
      industry: 'hvac', who: 'HVAC contractors', workflow: 'scheduling',
      label: 'PAIN_SIGNAL', query_tier: 1,
      evidence_excerpt: 'extremely detailed evidence about the frustration with current tools',
      evidence_verified: true, source_url: 'https://example.com',
    };

    // Min possible: low everything + all penalties
    const minItem = {
      points: 0, num_comments: 0, confidence: 0.1,
      industry: 'general',
      label: 'FEATURE_REQUEST', query_tier: 3,
      pain_summary: 'simple automated CRM dashboard',
      is_saturated: true,
      evidence_verified: false,
    };

    const maxScore = scoreOpportunity(maxItem);
    const minScore = scoreOpportunity(minItem);

    console.log(`  (Max item score: ${maxScore}, Min item score: ${minScore})`);

    const errors = [];
    if (maxScore < 0 || maxScore > 100) errors.push(`Max score ${maxScore} out of bounds [0, 100]`);
    if (minScore < 0 || minScore > 100) errors.push(`Min score ${minScore} out of bounds [0, 100]`);

    // Also test a bunch of random-ish combos
    const randomItems = [
      { points: 0, num_comments: 0, confidence: 0, is_saturated: true, evidence_verified: false, pain_summary: 'better smart automated CRM tool', label: 'FEATURE_REQUEST', query_tier: 3 },
      { points: 500, num_comments: 200, confidence: 1.0, industry: 'bookkeeping', who: 'bookkeepers', label: 'PAIN_SIGNAL', query_tier: 1, evidence_excerpt: 'a'.repeat(100), evidence_verified: true, source_url: 'https://x.com', num_comments: 200 },
    ];

    for (const item of randomItems) {
      const s = scoreOpportunity(item);
      if (s < 0 || s > 100) errors.push(`Score ${s} out of bounds for item`);
    }

    if (errors.length > 0) return fail(name, errors.join('; '));
    pass(name, `All scores in [0, 100]: max=${maxScore}, min=${minScore}`);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('=== STEP 5: SCORING & SATURATED MARKETS — Automated Verification Tests ===\n');

test5_1();
test5_2();
test5_3();
test5_4();
test5_5();
test5_6();

console.log('\n=== SUMMARY ===');
const passed = testResults.filter(Boolean).length;
const total = testResults.length;

if (passed === total) {
  console.log(`STEP 5 PASSED \u2705 \u2014 All ${total} tests passed`);
} else {
  console.log(`STEP 5 FAILED \u274C \u2014 ${passed}/${total} tests passed`);
}

process.exit(passed === total ? 0 : 1);
