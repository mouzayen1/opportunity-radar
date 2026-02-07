-- OpportunityRadar v4 Migration
-- Adds new fields for enhanced opportunity tracking

-- New columns for v4
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS opp_type TEXT DEFAULT 'greenfield';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS engagement_level TEXT DEFAULT 'medium';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS willingness_to_pay TEXT DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS build_complexity TEXT DEFAULT 'medium';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 1;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deep_analysis JSONB DEFAULT NULL;

-- Update overall_score constraint to allow 0-100
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_overall_score_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_overall_score_check CHECK (overall_score >= 0 AND overall_score <= 100);

-- Index for new fields
CREATE INDEX IF NOT EXISTS idx_opportunities_opp_type ON opportunities(opp_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_engagement ON opportunities(engagement_level);
CREATE INDEX IF NOT EXISTS idx_opportunities_source_count ON opportunities(source_count DESC);
