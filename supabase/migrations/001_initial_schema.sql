-- ============================================
-- PainRadar v3 Schema
-- Run in Supabase SQL Editor
-- ============================================

-- Drop old OpportunityRadar tables
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS collection_runs CASCADE;

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  website TEXT,
  logo_url TEXT,
  g2_url TEXT,
  capterra_url TEXT,
  trustpilot_url TEXT,
  estimated_price_low DECIMAL,
  estimated_price_high DECIMAL,
  pricing_model TEXT,

  -- Aggregated scores (updated by scoring job)
  pain_score DECIMAL DEFAULT 0,
  disruption_score DECIMAL DEFAULT 0,
  platform_count INTEGER DEFAULT 0,
  total_complaints INTEGER DEFAULT 0,
  avg_severity DECIMAL DEFAULT 0,
  trending_direction TEXT DEFAULT 'stable',
  trending_delta DECIMAL DEFAULT 0,
  build_this_summary TEXT,

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_complaint_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search
  search_vector TSVECTOR
);

CREATE INDEX idx_products_pain ON products(pain_score DESC);
CREATE INDEX idx_products_disruption ON products(disruption_score DESC);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_normalized ON products(normalized_name);

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION products_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.subcategory, '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_update();

-- Raw complaints from all sources
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  source TEXT NOT NULL,
  source_id TEXT,
  source_url TEXT,

  raw_text TEXT NOT NULL,
  title TEXT,
  author TEXT,
  author_role TEXT,
  author_company_size TEXT,
  star_rating DECIMAL,

  -- AI-extracted fields
  pain_categories TEXT[],
  pain_summary TEXT,
  severity INTEGER,
  wishes TEXT,
  specific_feature_gaps TEXT[],
  competitor_mentions TEXT[],
  sentiment_score DECIMAL,
  switching_intent TEXT,
  user_segment TEXT,

  review_date TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed BOOLEAN DEFAULT FALSE,

  UNIQUE(source, source_id)
);

CREATE INDEX idx_complaints_product ON complaints(product_id);
CREATE INDEX idx_complaints_source ON complaints(source);
CREATE INDEX idx_complaints_severity ON complaints(severity DESC);
CREATE INDEX idx_complaints_date ON complaints(review_date DESC);
CREATE INDEX idx_complaints_analyzed ON complaints(analyzed) WHERE analyzed = FALSE;
CREATE INDEX idx_complaints_categories ON complaints USING GIN(pain_categories);

-- Pain category aggregation per product
CREATE TABLE product_pain_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  pain_category TEXT NOT NULL,
  mention_count INTEGER DEFAULT 0,
  avg_severity DECIMAL DEFAULT 0,
  platforms TEXT[],
  sample_quotes TEXT[],
  common_wishes TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, pain_category)
);

-- Cross-platform signal tracking
CREATE TABLE cross_platform_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  signal_text TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  platform_count INTEGER NOT NULL,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  total_mentions INTEGER DEFAULT 0,
  representative_complaints UUID[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_product ON cross_platform_signals(product_id);
CREATE INDEX idx_signals_count ON cross_platform_signals(platform_count DESC);

-- Scraping job tracking
CREATE TABLE collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_analyzed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Categories we actively monitor
CREATE TABLE monitored_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  g2_category_url TEXT,
  capterra_category_url TEXT,
  subreddits TEXT[],
  hn_search_terms TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_monitored_categories_name ON monitored_categories(name);

-- User saved products
CREATE TABLE saved_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pain_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- Anonymous read access
CREATE POLICY "anon_read_products" ON products FOR SELECT USING (true);
CREATE POLICY "anon_read_complaints" ON complaints FOR SELECT USING (true);
CREATE POLICY "anon_read_pain_summary" ON product_pain_summary FOR SELECT USING (true);
CREATE POLICY "anon_read_signals" ON cross_platform_signals FOR SELECT USING (true);
CREATE POLICY "anon_read_runs" ON collection_runs FOR SELECT USING (true);
CREATE POLICY "anon_read_categories" ON monitored_categories FOR SELECT USING (true);
CREATE POLICY "anon_read_saved" ON saved_products FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "service_all_products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_complaints" ON complaints FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_pain_summary" ON product_pain_summary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_signals" ON cross_platform_signals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_runs" ON collection_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_categories" ON monitored_categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_saved" ON saved_products FOR ALL USING (auth.role() = 'service_role');
