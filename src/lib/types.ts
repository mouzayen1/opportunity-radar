// Opportunity Types
export type OpportunityType = 'GREENFIELD' | 'MAKE_IT_BETTER';

export type ComplaintType =
  | 'pricing'
  | 'missing_feature'
  | 'complexity'
  | 'performance'
  | 'support'
  | 'reliability'
  | 'other';

export type Complexity = 'weekend' | 'month' | 'quarter' | 'major';

export type Source = 'hackernews' | 'reddit' | 'github';

// Raw item from collectors before filtering
export interface RawItem {
  source: Source;
  source_id: string;
  source_url: string;
  title: string;
  raw_text: string;
  upvotes: number;
  comments_count: number;
  posted_at: Date;
}

// Item after Stage 1 filtering
export interface FilteredItem extends RawItem {
  opportunity_type: OpportunityType;
  matched_patterns: string[];
}

// AI Analysis result from Stage 2
export interface OpportunityAnalysis {
  summary: string;
  problem_description?: string;      // For GREENFIELD
  existing_solution?: string;        // For MAKE_IT_BETTER
  complaint_type?: ComplaintType;    // For MAKE_IT_BETTER
  target_market: string;
  complexity: Complexity;
  pain_score: number;
  market_score: number;
  feasibility_score: number;
  urgency_score: number;
}

// Full opportunity record for database
export interface Opportunity {
  id?: string;
  source: Source;
  source_id: string;
  source_url: string;
  opportunity_type: OpportunityType;
  complaint_type?: ComplaintType;
  title: string;
  raw_text: string;
  summary?: string;
  problem_description?: string;
  existing_solution?: string;
  target_market?: string;
  complexity?: Complexity;
  pain_score?: number;
  market_score?: number;
  feasibility_score?: number;
  urgency_score?: number;
  recency_score?: number;
  replacement_score?: number;
  overall_score?: number;
  upvotes: number;
  comments_count: number;
  posted_at: Date;
  collected_at?: Date;
  analyzed_at?: Date;
}

// Collection run tracking
export interface CollectionRun {
  id?: string;
  started_at?: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  total_fetched: number;
  passed_stage1: number;
  analyzed: number;
  saved: number;
  duplicates_skipped: number;
  hackernews_count: number;
  reddit_count: number;
  github_count: number;
  greenfield_count: number;
  make_it_better_count: number;
  error_message?: string;
}

// API Response types
export interface OpportunitiesResponse {
  data: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterParams {
  type?: OpportunityType | 'ALL';
  source?: Source | 'ALL';
  complaint_type?: ComplaintType | 'ALL';
  complexity?: Complexity | 'ALL';
  min_score?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}
