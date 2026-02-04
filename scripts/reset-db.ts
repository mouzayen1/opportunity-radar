import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function resetOpportunities() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get count before
  const { count: before } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Current opportunities in DB: ${before}`)
  
  // Delete all opportunities
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (neq trick)
  
  if (error) {
    console.error('Error deleting:', error)
    return
  }
  
  // Verify deletion
  const { count: after } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
  
  console.log(`After cleanup: ${after} opportunities`)
  console.log('Database cleared successfully!')
}

resetOpportunities()
