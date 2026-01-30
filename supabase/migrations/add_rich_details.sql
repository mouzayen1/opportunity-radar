-- Add rich detail columns to opportunities table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS market_size TEXT,
ADD COLUMN IF NOT EXISTS monetization TEXT,
ADD COLUMN IF NOT EXISTS mvp_features TEXT[],
ADD COLUMN IF NOT EXISTS unique_angle TEXT;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'opportunities'
ORDER BY ordinal_position;
