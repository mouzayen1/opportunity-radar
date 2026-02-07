import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
  const sort = searchParams.get('sort') || 'score'
  const type = searchParams.get('type') || 'all' // greenfield | makeItBetter | all
  const source = searchParams.get('source') || 'all'
  const engagement = searchParams.get('engagement') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

  const supabase = createServerClient()

  let query = supabase.from('opportunities').select('*')

  // Search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
  }

  // Category filter
  if (categories.length > 0) {
    query = query.overlaps('category', categories)
  }

  // Type filter
  if (type !== 'all') {
    query = query.eq('opp_type', type)
  }

  // Engagement filter
  if (engagement !== 'all') {
    query = query.eq('engagement_level', engagement)
  }

  // Sorting
  switch (sort) {
    case 'pain':
      query = query.order('pain_score', { ascending: false })
      break
    case 'trend':
      query = query.order('trend_score', { ascending: false })
      break
    case 'gap':
      query = query.order('gap_score', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'buildability':
      query = query.order('gap_score', { ascending: false }) // Use gap as proxy
      break
    case 'score':
    default:
      query = query.order('overall_score', { ascending: false })
      break
  }

  query = query.limit(limit)

  const { data: opportunities, error } = await query

  if (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }

  return NextResponse.json({ opportunities })
}
