// ============ CORE TYPES FOR OPPORTUNITYRADAR v4 ============

// Raw opportunity from any data source before scoring
export interface RawOpportunity {
  id: string
  title: string
  problem: string
  source: DataSourceType
  subreddit?: string
  type: 'greenfield' | 'makeItBetter'
  engagement: 'high' | 'medium' | 'low'
  recency: number // days old
  url: string | null
  author?: string
  points?: number
  commentCount?: number
  existingTool?: string | null
  workaround?: string
  frequency?: string
  willingness_to_pay?: string
  competitors?: string[]
  industry?: string
  targetUser?: string
  buildComplexity?: 'easy' | 'medium' | 'hard'
  // AI mission specific fields
  missionId?: number
  topComplaints?: string[]
  currentPrice?: string
  desiredPrice?: string
  triggerEvent?: string
  migrationTarget?: string
  aiCapability?: string
  moat?: string
  statedPrice?: string
  sourceCount?: number
}

// Scored opportunity after AI analysis
export interface ScoredOpportunity extends RawOpportunity {
  score: number // 0-100 total
  demandScore: number // 0-30
  recencyScore: number // 0-20
  buildabilityScore: number // 0-20
  sourceQualityScore: number // 0-15
  marketSignalScore: number // 0-15
}

// Deep analysis result for top opportunities
export interface DeepAnalysis {
  rank: number
  title: string
  type: 'greenfield' | 'makeItBetter'
  problem: string
  solution: string
  viability: number // 1-100
  market: string
  difficulty: 'weekend' | 'week' | 'month'
  monthlyRevenue: string
  competitors: string[]
  competitorWeakness: string
  moat: string
  pricing: string
  firstCustomers: string
  validationStep: string
  redFlag: string
  evidence: number // number of independent sources
}

// Full opportunity stored in Supabase
export interface Opportunity {
  id: string
  title: string
  summary: string
  pain_score: number
  trend_score: number
  gap_score: number
  overall_score: number
  category: string[]
  sources: Source[]
  trend_data: TrendDataPoint[]
  competitors: Competitor[]
  keywords: string[]
  created_at: string
  updated_at: string
  // Rich details
  problem?: string
  solution?: string
  target_audience?: string
  market_size?: string
  monetization?: string
  mvp_features?: string[]
  unique_angle?: string
  // v4 fields
  opp_type?: 'greenfield' | 'makeItBetter'
  engagement_level?: string
  willingness_to_pay?: string
  build_complexity?: string
  source_count?: number
  deep_analysis?: DeepAnalysis | null
}

export type DataSourceType =
  | 'hackernews'
  | 'reddit'
  | 'devto'
  | 'github'
  | 'stackoverflow'
  | 'lobsters'
  | 'producthunt'
  | 'indiehackers'
  | 'ai_mission'

export interface Source {
  platform: string
  url: string
  quote: string
  author?: string
  date?: string
}

export interface TrendDataPoint {
  date: string
  value: number
}

export interface Competitor {
  name: string
  rating?: number
  weakness: string
}

// Data source status tracking
export interface DataSourceStatus {
  name: string
  type: DataSourceType
  status: 'pending' | 'scanning' | 'success' | 'cors_blocked' | 'error'
  resultCount: number
  errorMessage?: string
  duration?: number
  timestamp?: number
}

// Log entry for the Logs tab
export interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'success' | 'warning' | 'error'
  source: string
  message: string
}

// Scan state for the dashboard
export interface ScanState {
  status: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
  phase: string
  progress: number // 0-100
  opportunities: ScoredOpportunity[]
  insights: DeepAnalysis[]
  sources: DataSourceStatus[]
  logs: LogEntry[]
  stats: {
    totalCollected: number
    totalScored: number
    totalDeduplicated: number
    totalAnalyzed: number
    apiCallsMade: number
    scanStartTime: number
    scanEndTime?: number
  }
}

// AI Mission definition
export interface AIMission {
  id: number
  name: string
  description: string
  prompt: string
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      opportunities: {
        Row: Opportunity
        Insert: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}

// Category definition
export type Category =
  | 'saas'
  | 'developer-tools'
  | 'productivity'
  | 'finance'
  | 'health'
  | 'education'
  | 'e-commerce'
  | 'ai-ml'
  | 'consumer'
  | 'b2b'
  | 'mobile'
  | 'automation'
  | 'niche-industry'
  | 'integration'
  | 'other'

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'saas', label: 'SaaS' },
  { value: 'developer-tools', label: 'Developer Tools' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'finance', label: 'Finance' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'ai-ml', label: 'AI/ML' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'b2b', label: 'B2B' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'automation', label: 'Automation' },
  { value: 'niche-industry', label: 'Niche Industry' },
  { value: 'integration', label: 'Integration' },
  { value: 'other', label: 'Other' },
]

// Filter options for the Feed tab
export interface FeedFilters {
  type: 'all' | 'greenfield' | 'makeItBetter'
  source: 'all' | DataSourceType
  engagement: 'all' | 'high' | 'medium' | 'low'
  search: string
  sort: 'score' | 'recency' | 'engagement' | 'buildability'
}
