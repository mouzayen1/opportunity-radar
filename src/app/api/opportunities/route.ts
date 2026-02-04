import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { FilterParams } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filter params
    const filters: FilterParams = {
      type: (searchParams.get('type') as FilterParams['type']) ?? 'ALL',
      source: (searchParams.get('source') as FilterParams['source']) ?? 'ALL',
      complaint_type: (searchParams.get('complaint_type') as FilterParams['complaint_type']) ?? 'ALL',
      complexity: (searchParams.get('complexity') as FilterParams['complexity']) ?? 'ALL',
      min_score: parseInt(searchParams.get('min_score') ?? '0') || 0,
      search: searchParams.get('search') ?? '',
      page: parseInt(searchParams.get('page') ?? '1') || 1,
      pageSize: parseInt(searchParams.get('pageSize') ?? '20') || 20,
    };

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from('opportunities')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.type && filters.type !== 'ALL') {
      query = query.eq('opportunity_type', filters.type);
    }

    if (filters.source && filters.source !== 'ALL') {
      query = query.eq('source', filters.source);
    }

    if (filters.complaint_type && filters.complaint_type !== 'ALL') {
      query = query.eq('complaint_type', filters.complaint_type);
    }

    if (filters.complexity && filters.complexity !== 'ALL') {
      query = query.eq('complexity', filters.complexity);
    }

    if (filters.min_score && filters.min_score > 0) {
      query = query.gte('overall_score', filters.min_score);
    }

    // Full-text search
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,raw_text.ilike.%${searchTerm}%`);
    }

    // Order by overall_score descending
    query = query.order('overall_score', { ascending: false, nullsFirst: false });

    // Pagination
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
