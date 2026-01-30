import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time migration to add rich detail columns
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Try to add columns by updating a row with the new fields
  // If columns don't exist, we'll get an error message telling us
  const { data: testData, error: testError } = await supabase
    .from('opportunities')
    .select('id, problem, solution, target_audience, market_size, monetization, mvp_features, unique_angle')
    .limit(1)

  if (testError) {
    // Columns likely don't exist - need to run SQL manually
    return NextResponse.json({
      status: 'columns_missing',
      message: 'Please run the SQL migration in Supabase Dashboard',
      error: testError.message,
      sql: `ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS market_size TEXT,
ADD COLUMN IF NOT EXISTS monetization TEXT,
ADD COLUMN IF NOT EXISTS mvp_features TEXT[],
ADD COLUMN IF NOT EXISTS unique_angle TEXT;`
    })
  }

  return NextResponse.json({
    status: 'columns_exist',
    message: 'Migration columns already exist! Ready to enrich.',
    sample: testData
  })
}
