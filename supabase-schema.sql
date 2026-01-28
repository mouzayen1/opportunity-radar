-- OpportunityRadar Database Schema
-- Run this in your Supabase SQL Editor (supabase.com -> Your Project -> SQL Editor)

-- Create the opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  pain_score INTEGER NOT NULL CHECK (pain_score >= 0 AND pain_score <= 10),
  trend_score INTEGER NOT NULL CHECK (trend_score >= 0 AND trend_score <= 10),
  gap_score INTEGER NOT NULL CHECK (gap_score >= 0 AND gap_score <= 10),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  category TEXT[] NOT NULL DEFAULT '{}',
  sources JSONB NOT NULL DEFAULT '[]',
  trend_data JSONB NOT NULL DEFAULT '[]',
  competitors JSONB NOT NULL DEFAULT '[]',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_overall_score ON opportunities(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_keywords ON opportunities USING GIN(keywords);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON opportunities
  FOR SELECT USING (true);

-- Create policy to allow service role full access (for data pipeline)
CREATE POLICY "Allow service role full access" ON opportunities
  FOR ALL USING (auth.role() = 'service_role');

-- Insert some seed data for testing
INSERT INTO opportunities (title, summary, pain_score, trend_score, gap_score, overall_score, category, sources, trend_data, competitors, keywords)
VALUES
(
  'Freelancer Invoice Tracking',
  'Freelancers struggle with tracking invoices, following up on late payments, and managing multiple clients. Existing tools are either too complex or lack key features like automatic reminders.',
  9,
  8,
  7,
  85,
  ARRAY['saas', 'finance', 'productivity'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=1", "quote": "I spend hours every month chasing payments. Why is there no simple tool for this?", "author": "freelancer123"}]'::jsonb,
  '[{"date": "2024-01", "value": 45}, {"date": "2024-06", "value": 62}, {"date": "2024-12", "value": 78}, {"date": "2025-01", "value": 85}]'::jsonb,
  '[{"name": "FreshBooks", "rating": 3.8, "weakness": "Too complex for solo freelancers"}, {"name": "Wave", "rating": 3.5, "weakness": "Poor mobile experience"}]'::jsonb,
  ARRAY['invoice', 'freelance', 'payments', 'billing']
),
(
  'Developer Documentation Search',
  'Developers waste significant time searching through poorly organized documentation. Current solutions don''t understand context or remember previous searches.',
  8,
  9,
  8,
  88,
  ARRAY['developer-tools', 'ai-ml', 'productivity'],
  '[{"platform": "github", "url": "https://github.com/example/repo/issues/1", "quote": "Spent 2 hours looking for a simple API endpoint. The docs search is useless.", "author": "dev_frustrated"}]'::jsonb,
  '[{"date": "2024-01", "value": 55}, {"date": "2024-06", "value": 70}, {"date": "2024-12", "value": 82}, {"date": "2025-01", "value": 90}]'::jsonb,
  '[{"name": "Algolia DocSearch", "rating": 4.0, "weakness": "No context awareness"}, {"name": "ReadMe", "rating": 3.7, "weakness": "Expensive for small teams"}]'::jsonb,
  ARRAY['documentation', 'search', 'developer', 'api']
),
(
  'Recipe Meal Planning by Diet',
  'People with dietary restrictions struggle to find and organize recipes that fit their needs. Existing apps don''t handle multiple restrictions well or make meal planning tedious.',
  7,
  8,
  9,
  82,
  ARRAY['consumer', 'health', 'mobile'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=2", "quote": "My wife is gluten-free, I am dairy-free, and our kid is picky. Finding dinner ideas is a nightmare.", "author": "hungry_dad"}]'::jsonb,
  '[{"date": "2024-01", "value": 50}, {"date": "2024-06", "value": 58}, {"date": "2024-12", "value": 72}, {"date": "2025-01", "value": 80}]'::jsonb,
  '[{"name": "Mealime", "rating": 4.2, "weakness": "Limited dietary filters"}, {"name": "Yummly", "rating": 3.9, "weakness": "Cluttered interface, too many ads"}]'::jsonb,
  ARRAY['recipe', 'meal-planning', 'diet', 'food', 'health']
),
(
  'Code Review Automation for Solo Devs',
  'Solo developers and small teams lack the feedback loop that larger teams have. They want automated code review that catches issues before they become problems.',
  8,
  9,
  6,
  79,
  ARRAY['developer-tools', 'ai-ml', 'saas'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=3", "quote": "Working alone means no one reviews my code. I ship bugs I would have caught with a second pair of eyes.", "author": "solo_founder"}]'::jsonb,
  '[{"date": "2024-01", "value": 60}, {"date": "2024-06", "value": 75}, {"date": "2024-12", "value": 88}, {"date": "2025-01", "value": 92}]'::jsonb,
  '[{"name": "GitHub Copilot", "rating": 4.3, "weakness": "Writes code, doesn''t review it"}, {"name": "SonarQube", "rating": 3.8, "weakness": "Complex setup, enterprise-focused"}]'::jsonb,
  ARRAY['code-review', 'automation', 'developer', 'quality']
),
(
  'Personal CRM for Networking',
  'Professionals struggle to maintain relationships and remember context about their network. LinkedIn is for connections, not relationship management.',
  7,
  7,
  8,
  76,
  ARRAY['productivity', 'b2b', 'saas'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=4", "quote": "I met someone at a conference 6 months ago. Now I can''t remember what we talked about or why I should follow up.", "author": "networker"}]'::jsonb,
  '[{"date": "2024-01", "value": 40}, {"date": "2024-06", "value": 52}, {"date": "2024-12", "value": 65}, {"date": "2025-01", "value": 72}]'::jsonb,
  '[{"name": "LinkedIn", "rating": 3.5, "weakness": "Not designed for relationship tracking"}, {"name": "Notion", "rating": 4.0, "weakness": "Requires manual setup and maintenance"}]'::jsonb,
  ARRAY['crm', 'networking', 'relationships', 'contacts']
),
(
  'API Testing for Non-Technical Founders',
  'Non-technical founders building with no-code tools struggle to test and debug API integrations. Postman and similar tools have steep learning curves.',
  8,
  8,
  9,
  86,
  ARRAY['developer-tools', 'saas', 'productivity'],
  '[{"platform": "github", "url": "https://github.com/example/repo/issues/2", "quote": "I just want to see if my Zapier webhook is sending the right data. Why do I need to learn Postman?", "author": "nocode_builder"}]'::jsonb,
  '[{"date": "2024-01", "value": 35}, {"date": "2024-06", "value": 50}, {"date": "2024-12", "value": 68}, {"date": "2025-01", "value": 75}]'::jsonb,
  '[{"name": "Postman", "rating": 4.2, "weakness": "Overwhelming for beginners"}, {"name": "Insomnia", "rating": 4.0, "weakness": "Still requires technical knowledge"}]'::jsonb,
  ARRAY['api', 'testing', 'no-code', 'integration']
),
(
  'Async Video Updates for Remote Teams',
  'Remote teams struggle with timezone differences for standups and updates. Existing video tools are synchronous or too informal.',
  8,
  9,
  7,
  83,
  ARRAY['saas', 'productivity', 'b2b'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=5", "quote": "Our team spans 12 timezones. Standups are impossible. Slack messages get lost. We need async video that''s organized.", "author": "remote_lead"}]'::jsonb,
  '[{"date": "2024-01", "value": 58}, {"date": "2024-06", "value": 72}, {"date": "2024-12", "value": 85}, {"date": "2025-01", "value": 88}]'::jsonb,
  '[{"name": "Loom", "rating": 4.4, "weakness": "Not structured for team updates"}, {"name": "Slack Clips", "rating": 3.6, "weakness": "Videos get buried in channels"}]'::jsonb,
  ARRAY['video', 'async', 'remote', 'standup', 'team']
),
(
  'Browser Tab Manager for Researchers',
  'Researchers and heavy browser users struggle with hundreds of tabs. Current extensions don''t help organize by project or topic.',
  7,
  6,
  8,
  73,
  ARRAY['productivity', 'developer-tools', 'consumer'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=6", "quote": "I have 200+ tabs open across 3 windows. Chrome crashes weekly. I need help but tab managers all suck.", "author": "tab_hoarder"}]'::jsonb,
  '[{"date": "2024-01", "value": 42}, {"date": "2024-06", "value": 48}, {"date": "2024-12", "value": 55}, {"date": "2025-01", "value": 60}]'::jsonb,
  '[{"name": "OneTab", "rating": 4.1, "weakness": "No organization features"}, {"name": "Toby", "rating": 3.8, "weakness": "Clunky interface, sync issues"}]'::jsonb,
  ARRAY['browser', 'tabs', 'productivity', 'research', 'organization']
),
(
  'Customer Feedback Aggregator',
  'Product teams collect feedback from multiple channels but struggle to aggregate and prioritize. Data lives in silos across tools.',
  9,
  8,
  7,
  84,
  ARRAY['saas', 'b2b', 'productivity'],
  '[{"platform": "github", "url": "https://github.com/example/repo/issues/3", "quote": "We have feedback in Intercom, Zendesk, Twitter, and email. No single view of what customers actually want.", "author": "pm_overwhelmed"}]'::jsonb,
  '[{"date": "2024-01", "value": 52}, {"date": "2024-06", "value": 65}, {"date": "2024-12", "value": 78}, {"date": "2025-01", "value": 82}]'::jsonb,
  '[{"name": "Productboard", "rating": 4.1, "weakness": "Expensive, complex setup"}, {"name": "Canny", "rating": 4.0, "weakness": "Doesn''t pull from existing channels"}]'::jsonb,
  ARRAY['feedback', 'product', 'customer', 'aggregation', 'prioritization']
),
(
  'Side Project Revenue Tracker',
  'Indie hackers with multiple small projects struggle to track revenue, expenses, and profitability across all their ventures in one place.',
  7,
  8,
  9,
  81,
  ARRAY['saas', 'finance', 'productivity'],
  '[{"platform": "hackernews", "url": "https://news.ycombinator.com/item?id=7", "quote": "I have 5 side projects making small amounts. Tracking which ones are actually profitable is a spreadsheet nightmare.", "author": "indie_hacker"}]'::jsonb,
  '[{"date": "2024-01", "value": 38}, {"date": "2024-06", "value": 55}, {"date": "2024-12", "value": 70}, {"date": "2025-01", "value": 78}]'::jsonb,
  '[{"name": "QuickBooks", "rating": 3.9, "weakness": "Overkill for side projects"}, {"name": "Spreadsheets", "rating": 3.0, "weakness": "Manual, error-prone, no insights"}]'::jsonb,
  ARRAY['revenue', 'side-project', 'indie', 'finance', 'tracking']
);
