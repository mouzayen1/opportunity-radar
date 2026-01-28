import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
  const sort = searchParams.get('sort') || 'score'

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
    case 'score':
    default:
      query = query.order('overall_score', { ascending: false })
      break
  }

  const { data: opportunities, error } = await query

  if (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }

  return NextResponse.json({ opportunities })
}
