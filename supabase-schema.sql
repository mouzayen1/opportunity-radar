-- OpportunityRadar v2 Schema
-- Run this in Supabase SQL Editor to reset the database

-- Drop existing tables if they exist
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS collection_runs CASCADE;

-- Create opportunities table
CREATE TABLE opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source info
  source TEXT NOT NULL CHECK (source IN ('hackernews', 'reddit', 'github')),
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,

  -- Opportunity classification
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('GREENFIELD', 'MAKE_IT_BETTER')),

  -- For GREENFIELD: describes the problem
  -- For MAKE_IT_BETTER: describes what's wrong with existing solution
  complaint_type TEXT CHECK (
    complaint_type IS NULL OR
    complaint_type IN ('pricing', 'missing_feature', 'complexity', 'performance', 'support', 'reliability', 'other')
  ),

  -- Content
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,

  -- AI Analysis Results
  summary TEXT,
  problem_description TEXT,      -- For GREENFIELD
  existing_solution TEXT,        -- For MAKE_IT_BETTER
  target_market TEXT,
  complexity TEXT CHECK (complexity IN ('weekend', 'month', 'quarter', 'major')),

  -- Scores (0-100)
  pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 100),
  market_score INTEGER CHECK (market_score >= 0 AND market_score <= 100),
  feasibility_score INTEGER CHECK (feasibility_score >= 0 AND feasibility_score <= 100),
  urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 100),

  -- Calculated scores
  recency_score INTEGER CHECK (recency_score >= 0 AND recency_score <= 100),
  replacement_score INTEGER,     -- Only for MAKE_IT_BETTER
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Engagement
  upvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Timestamps
  posted_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure unique source + source_id combination
  UNIQUE(source, source_id)
);

-- Create collection_runs table
CREATE TABLE collection_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),

  -- Stats
  total_fetched INTEGER DEFAULT 0,
  passed_stage1 INTEGER DEFAULT 0,
  analyzed INTEGER DEFAULT 0,
  saved INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,

  -- Breakdown by source
  hackernews_count INTEGER DEFAULT 0,
  reddit_count INTEGER DEFAULT 0,
  github_count INTEGER DEFAULT 0,

  -- Breakdown by type
  greenfield_count INTEGER DEFAULT 0,
  make_it_better_count INTEGER DEFAULT 0,

  -- Error info
  error_message TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_opportunities_type ON opportunities(opportunity_type);
CREATE INDEX idx_opportunities_source ON opportunities(source);
CREATE INDEX idx_opportunities_complaint ON opportunities(complaint_type);
CREATE INDEX idx_opportunities_complexity ON opportunities(complexity);
CREATE INDEX idx_opportunities_overall_score ON opportunities(overall_score DESC);
CREATE INDEX idx_opportunities_posted_at ON opportunities(posted_at DESC);
CREATE INDEX idx_opportunities_collected_at ON opportunities(collected_at DESC);

-- Full-text search index
CREATE INDEX idx_opportunities_search ON opportunities
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(raw_text, '') || ' ' || coalesce(summary, '')));

-- Index for deduplication lookup
CREATE INDEX idx_opportunities_source_id ON opportunities(source, source_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous read access
CREATE POLICY "Allow anonymous read access to opportunities"
  ON opportunities FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous read access to collection_runs"
  ON collection_runs FOR SELECT
  USING (true);

-- Create policies for service role write access
CREATE POLICY "Allow service role full access to opportunities"
  ON opportunities FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to collection_runs"
  ON collection_runs FOR ALL
  USING (auth.role() = 'service_role');
