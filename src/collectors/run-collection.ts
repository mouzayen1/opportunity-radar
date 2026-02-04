import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createServerClient } from '../lib/supabase';
import { CollectionRun, Opportunity } from '../lib/types';
import { collectFromHackerNews } from './hackernews';
import { collectFromReddit } from './reddit';
import { collectFromGitHub } from './github';
import { filterItems, prioritizeForAnalysis } from './stage1-filter';
import { analyzeItems, selectForAnalysis } from './stage2-analyze';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollectionRun(): Promise<string> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('collection_runs')
    .insert({
      status: 'running',
      total_fetched: 0,
      passed_stage1: 0,
      analyzed: 0,
      saved: 0,
      duplicates_skipped: 0,
      hackernews_count: 0,
      reddit_count: 0,
      github_count: 0,
      greenfield_count: 0,
      make_it_better_count: 0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create collection run: ${error.message}`);
  }

  return data.id;
}

async function updateCollectionRun(id: string, updates: Partial<CollectionRun>): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('collection_runs')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update collection run:', error);
  }
}

async function saveOpportunities(opportunities: Opportunity[]): Promise<{ saved: number; skipped: number }> {
  const supabase = createServerClient();
  let saved = 0;
  let skipped = 0;

  for (const opp of opportunities) {
    // Format dates for PostgreSQL
    const formattedOpp = {
      ...opp,
      posted_at: opp.posted_at.toISOString(),
      analyzed_at: opp.analyzed_at?.toISOString(),
    };

    const { error } = await supabase
      .from('opportunities')
      .upsert(formattedOpp, {
        onConflict: 'source,source_id',
        ignoreDuplicates: true,
      });

    if (error) {
      if (error.code === '23505') {
        // Unique violation - duplicate
        skipped++;
      } else {
        console.error('Error saving opportunity:', error);
        skipped++;
      }
    } else {
      saved++;
    }
  }

  return { saved, skipped };
}

async function runCollection(): Promise<void> {
  console.log('='.repeat(60));
  console.log('OpportunityRadar v2 - Collection Run');
  console.log('Started at:', new Date().toISOString());
  console.log('='.repeat(60));

  let runId: string | null = null;

  try {
    // Create collection run record
    runId = await createCollectionRun();
    console.log(`Collection run ID: ${runId}\n`);

    // Step 1: Collect from all sources in parallel
    console.log('Step 1: Collecting from sources...\n');

    const [hnItems, redditItems, githubItems] = await Promise.all([
      collectFromHackerNews(),
      collectFromReddit(),
      collectFromGitHub(),
    ]);

    const totalFetched = hnItems.length + redditItems.length + githubItems.length;
    console.log(`\nTotal fetched: ${totalFetched}`);
    console.log(`  - HackerNews: ${hnItems.length}`);
    console.log(`  - Reddit: ${redditItems.length}`);
    console.log(`  - GitHub: ${githubItems.length}`);

    // Combine all items
    const allItems = [...hnItems, ...redditItems, ...githubItems];

    // Step 2: Stage 1 filtering
    console.log('\nStep 2: Stage 1 filtering...');
    const filtered = filterItems(allItems);
    console.log(`Passed Stage 1: ${filtered.length} (${((filtered.length / totalFetched) * 100).toFixed(1)}%)`);

    // Count by type
    const greenfieldFiltered = filtered.filter(i => i.opportunity_type === 'GREENFIELD');
    const makeItBetterFiltered = filtered.filter(i => i.opportunity_type === 'MAKE_IT_BETTER');
    console.log(`  - GREENFIELD: ${greenfieldFiltered.length}`);
    console.log(`  - MAKE_IT_BETTER: ${makeItBetterFiltered.length}`);

    // Step 3: Prioritize and select for Stage 2
    console.log('\nStep 3: Selecting for Stage 2 analysis...');
    const prioritized = prioritizeForAnalysis(filtered);
    const toAnalyze = selectForAnalysis(prioritized, 0.3); // Top 30%
    console.log(`Selected for analysis: ${toAnalyze.length}`);

    // Step 4: Stage 2 analysis with Groq
    console.log('\nStep 4: Running Stage 2 analysis with Groq...\n');
    const { opportunities, analyzed_count, quota_hit } = await analyzeItems(toAnalyze);

    if (quota_hit) {
      console.log('\nNote: Groq quota was hit, partial results saved.');
    }

    // Step 5: Save to database
    console.log('\nStep 5: Saving to database...');
    const { saved, skipped } = await saveOpportunities(opportunities);
    console.log(`Saved: ${saved}, Duplicates skipped: ${skipped}`);

    // Count final results by type
    const greenfieldSaved = opportunities.filter(o => o.opportunity_type === 'GREENFIELD').length;
    const makeItBetterSaved = opportunities.filter(o => o.opportunity_type === 'MAKE_IT_BETTER').length;

    // Update collection run
    await updateCollectionRun(runId, {
      status: 'completed',
      completed_at: new Date(),
      total_fetched: totalFetched,
      passed_stage1: filtered.length,
      analyzed: analyzed_count,
      saved: saved,
      duplicates_skipped: skipped,
      hackernews_count: hnItems.length,
      reddit_count: redditItems.length,
      github_count: githubItems.length,
      greenfield_count: greenfieldSaved,
      make_it_better_count: makeItBetterSaved,
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Collection Complete!');
    console.log('='.repeat(60));
    console.log(`Total fetched:    ${totalFetched}`);
    console.log(`Passed Stage 1:   ${filtered.length}`);
    console.log(`Analyzed:         ${analyzed_count}`);
    console.log(`Saved:            ${saved}`);
    console.log(`Skipped:          ${skipped}`);
    console.log(`GREENFIELD:       ${greenfieldSaved}`);
    console.log(`MAKE_IT_BETTER:   ${makeItBetterSaved}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nCollection run failed:', error);

    if (runId) {
      await updateCollectionRun(runId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    process.exit(1);
  }
}

// Run the collection
runCollection();
