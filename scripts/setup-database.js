const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const opportunities = [
  {
    title: 'Freelancer Invoice Tracking',
    summary: 'Freelancers struggle with tracking invoices and following up on late payments.',
    pain_score: 9, trend_score: 8, gap_score: 7, overall_score: 85,
    category: ['saas', 'finance'],
    sources: [{ platform: 'hackernews', quote: 'I spend hours chasing payments', author: 'user1' }],
    trend_data: [{ date: '2024-01', value: 45 }, { date: '2025-01', value: 85 }],
    competitors: [{ name: 'FreshBooks', rating: 3.8, weakness: 'Too complex' }],
    keywords: ['invoice', 'freelance']
  },
  {
    title: 'Developer Documentation Search',
    summary: 'Developers waste time searching poorly organized docs.',
    pain_score: 8, trend_score: 9, gap_score: 8, overall_score: 88,
    category: ['developer-tools', 'ai-ml'],
    sources: [{ platform: 'github', quote: 'Docs search is useless', author: 'dev1' }],
    trend_data: [{ date: '2024-01', value: 55 }, { date: '2025-01', value: 90 }],
    competitors: [{ name: 'Algolia', rating: 4.0, weakness: 'No context' }],
    keywords: ['documentation', 'search']
  },
  {
    title: 'Recipe Meal Planning by Diet',
    summary: 'People with dietary restrictions struggle to find recipes.',
    pain_score: 7, trend_score: 8, gap_score: 9, overall_score: 82,
    category: ['consumer', 'health'],
    sources: [{ platform: 'hackernews', quote: 'Finding dinner ideas is a nightmare', author: 'dad1' }],
    trend_data: [{ date: '2024-01', value: 50 }, { date: '2025-01', value: 80 }],
    competitors: [{ name: 'Mealime', rating: 4.2, weakness: 'Limited filters' }],
    keywords: ['recipe', 'meal-planning']
  },
  {
    title: 'Code Review for Solo Devs',
    summary: 'Solo developers lack feedback loops for code quality.',
    pain_score: 8, trend_score: 9, gap_score: 6, overall_score: 79,
    category: ['developer-tools', 'ai-ml'],
    sources: [{ platform: 'hackernews', quote: 'No one reviews my code', author: 'solo1' }],
    trend_data: [{ date: '2024-01', value: 60 }, { date: '2025-01', value: 92 }],
    competitors: [{ name: 'Copilot', rating: 4.3, weakness: 'Writes not reviews' }],
    keywords: ['code-review', 'automation']
  },
  {
    title: 'Personal CRM for Networking',
    summary: 'Professionals struggle to maintain relationships.',
    pain_score: 7, trend_score: 7, gap_score: 8, overall_score: 76,
    category: ['productivity', 'b2b'],
    sources: [{ platform: 'hackernews', quote: 'Cant remember who I met', author: 'net1' }],
    trend_data: [{ date: '2024-01', value: 40 }, { date: '2025-01', value: 72 }],
    competitors: [{ name: 'LinkedIn', rating: 3.5, weakness: 'Not for tracking' }],
    keywords: ['crm', 'networking']
  },
  {
    title: 'API Testing for Non-Technical',
    summary: 'Non-technical founders struggle with API debugging.',
    pain_score: 8, trend_score: 8, gap_score: 9, overall_score: 86,
    category: ['developer-tools', 'saas'],
    sources: [{ platform: 'github', quote: 'Why do I need Postman', author: 'nocode1' }],
    trend_data: [{ date: '2024-01', value: 35 }, { date: '2025-01', value: 75 }],
    competitors: [{ name: 'Postman', rating: 4.2, weakness: 'Too complex' }],
    keywords: ['api', 'testing']
  },
  {
    title: 'Async Video for Remote Teams',
    summary: 'Remote teams struggle with timezone standups.',
    pain_score: 8, trend_score: 9, gap_score: 7, overall_score: 83,
    category: ['saas', 'productivity'],
    sources: [{ platform: 'hackernews', quote: 'Standups are impossible', author: 'remote1' }],
    trend_data: [{ date: '2024-01', value: 58 }, { date: '2025-01', value: 88 }],
    competitors: [{ name: 'Loom', rating: 4.4, weakness: 'Not structured' }],
    keywords: ['video', 'async']
  },
  {
    title: 'Browser Tab Manager',
    summary: 'Researchers struggle with hundreds of browser tabs.',
    pain_score: 7, trend_score: 6, gap_score: 8, overall_score: 73,
    category: ['productivity', 'consumer'],
    sources: [{ platform: 'hackernews', quote: 'Chrome crashes weekly', author: 'tabs1' }],
    trend_data: [{ date: '2024-01', value: 42 }, { date: '2025-01', value: 60 }],
    competitors: [{ name: 'OneTab', rating: 4.1, weakness: 'No organization' }],
    keywords: ['browser', 'tabs']
  },
  {
    title: 'Customer Feedback Aggregator',
    summary: 'Product teams struggle to aggregate feedback.',
    pain_score: 9, trend_score: 8, gap_score: 7, overall_score: 84,
    category: ['saas', 'b2b'],
    sources: [{ platform: 'github', quote: 'Feedback in silos', author: 'pm1' }],
    trend_data: [{ date: '2024-01', value: 52 }, { date: '2025-01', value: 82 }],
    competitors: [{ name: 'Productboard', rating: 4.1, weakness: 'Expensive' }],
    keywords: ['feedback', 'product']
  },
  {
    title: 'Side Project Revenue Tracker',
    summary: 'Indie hackers struggle to track multiple projects.',
    pain_score: 7, trend_score: 8, gap_score: 9, overall_score: 81,
    category: ['saas', 'finance'],
    sources: [{ platform: 'hackernews', quote: 'Spreadsheet nightmare', author: 'indie1' }],
    trend_data: [{ date: '2024-01', value: 38 }, { date: '2025-01', value: 78 }],
    competitors: [{ name: 'QuickBooks', rating: 3.9, weakness: 'Overkill' }],
    keywords: ['revenue', 'side-project']
  }
];

async function setup() {
  console.log('Inserting sample opportunities...');

  const { data, error } = await supabase
    .from('opportunities')
    .insert(opportunities);

  if (error) {
    console.error('Error:', error.message);
    console.log('\nThe table might not exist yet. Please run this SQL in Supabase first:');
    console.log('https://supabase.com/dashboard/project/pulzjdlyjjswtyayjdgs/sql');
    console.log('\nCREATE TABLE opportunities (');
    console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
    console.log('  title TEXT NOT NULL,');
    console.log('  summary TEXT NOT NULL,');
    console.log('  pain_score INTEGER NOT NULL,');
    console.log('  trend_score INTEGER NOT NULL,');
    console.log('  gap_score INTEGER NOT NULL,');
    console.log('  overall_score INTEGER NOT NULL,');
    console.log('  category TEXT[] DEFAULT \'{}\',');
    console.log('  sources JSONB DEFAULT \'[]\',');
    console.log('  trend_data JSONB DEFAULT \'[]\',');
    console.log('  competitors JSONB DEFAULT \'[]\',');
    console.log('  keywords TEXT[] DEFAULT \'{}\',');
    console.log('  created_at TIMESTAMPTZ DEFAULT NOW(),');
    console.log('  updated_at TIMESTAMPTZ DEFAULT NOW()');
    console.log(');');
    console.log('\nALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;');
    console.log('CREATE POLICY "public read" ON opportunities FOR SELECT USING (true);');
  } else {
    console.log('Success! Inserted', opportunities.length, 'opportunities.');
    console.log('Refresh your website to see them!');
  }
}

setup();
