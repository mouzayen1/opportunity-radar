// ============================================
// DATABASE TYPES
// ============================================

export type Source = "g2" | "capterra" | "trustpilot" | "reddit" | "hackernews";

export type PainCategory =
  | "pricing"
  | "ux"
  | "support"
  | "reliability"
  | "features"
  | "onboarding"
  | "mobile"
  | "contracts"
  | "integrations"
  | "scaling";

export type TrendingDirection = "rising" | "falling" | "stable";

export type SwitchingIntent =
  | "none"
  | "considering"
  | "actively_looking"
  | "already_switched";

export type UserSegment =
  | "small_business"
  | "mid_market"
  | "enterprise"
  | "freelancer";

export type PricingModel = "per-user" | "flat" | "tiered";

// ============================================
// PRODUCT (aggregated entity)
// ============================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  normalized_name: string;
  category: string | null;
  subcategory: string | null;
  website: string | null;
  logo_url: string | null;
  g2_url: string | null;
  capterra_url: string | null;
  trustpilot_url: string | null;
  estimated_price_low: number | null;
  estimated_price_high: number | null;
  pricing_model: PricingModel | null;

  // Aggregated scores
  pain_score: number;
  disruption_score: number;
  platform_count: number;
  total_complaints: number;
  avg_severity: number;
  trending_direction: TrendingDirection;
  trending_delta: number;
  build_this_summary: string | null;

  // Timestamps
  first_seen_at: string;
  last_complaint_at: string | null;
  updated_at: string;
}

// ============================================
// COMPLAINT (individual data point)
// ============================================

export interface Complaint {
  id: string;
  product_id: string;

  // Source
  source: Source;
  source_id: string | null;
  source_url: string | null;

  // Content
  raw_text: string;
  title: string | null;
  author: string | null;
  author_role: string | null;
  author_company_size: string | null;
  star_rating: number | null;

  // AI-extracted
  pain_categories: PainCategory[] | null;
  pain_summary: string | null;
  severity: number | null;
  wishes: string | null;
  specific_feature_gaps: string[] | null;
  competitor_mentions: string[] | null;
  sentiment_score: number | null;
  switching_intent: SwitchingIntent | null;
  user_segment: UserSegment | null;

  // Metadata
  review_date: string | null;
  collected_at: string;
  analyzed: boolean;
}

// ============================================
// SUPPORTING TABLES
// ============================================

export interface ProductPainSummary {
  id: string;
  product_id: string;
  pain_category: PainCategory;
  mention_count: number;
  avg_severity: number;
  platforms: Source[];
  sample_quotes: string[];
  common_wishes: string[];
  updated_at: string;
}

export interface CrossPlatformSignal {
  id: string;
  product_id: string;
  signal_text: string;
  platforms: Source[];
  platform_count: number;
  first_seen: string | null;
  last_seen: string | null;
  total_mentions: number;
  representative_complaints: string[];
  updated_at: string;
}

export interface CollectionRun {
  id: string;
  source: Source;
  status: "running" | "completed" | "failed";
  items_found: number;
  items_new: number;
  items_analyzed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface MonitoredCategory {
  id: string;
  name: string;
  g2_category_url: string | null;
  capterra_category_url: string | null;
  subreddits: string[];
  hn_search_terms: string[];
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface SavedProduct {
  id: string;
  product_id: string;
  notes: string | null;
  saved_at: string;
}

// ============================================
// COLLECTOR TYPES (internal, not DB)
// ============================================

export interface RawComplaint {
  source: Source;
  source_id: string;
  source_url: string;
  title: string | null;
  raw_text: string;
  author: string | null;
  author_role: string | null;
  author_company_size: string | null;
  star_rating: number | null;
  review_date: Date;
}

export interface AIExtraction {
  product_name: string | null;
  product_category: string | null;
  pain_categories: PainCategory[];
  pain_summary: string;
  severity: number;
  wishes: string | null;
  specific_feature_gaps: string[];
  competitor_mentions: string[];
  estimated_monthly_spend: string | null;
  user_segment: UserSegment | null;
  switching_intent: SwitchingIntent;
  is_valid_complaint: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  minPainScore?: number;
  minDisruptionScore?: number;
  minPlatformCount?: number;
  painCategory?: PainCategory;
  trendingDirection?: TrendingDirection;
  sortBy?: "pain_score" | "disruption_score" | "trending_delta" | "last_complaint_at";
  page?: number;
  pageSize?: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalComplaints: number;
  avgPainScore: number;
  trendingCount: number;
}
