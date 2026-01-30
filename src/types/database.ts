export type Opportunity = {
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
  // Rich details for actionable insights
  problem?: string
  solution?: string
  target_audience?: string
  market_size?: string
  monetization?: string
  mvp_features?: string[]
  unique_angle?: string
}

export type Source = {
  platform: 'hackernews' | 'github' | 'producthunt' | 'appstore'
  url: string
  quote: string
  author?: string
  date?: string
}

export type TrendDataPoint = {
  date: string
  value: number
}

export type Competitor = {
  name: string
  rating: number
  weakness: string
}

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
  { value: 'other', label: 'Other' },
]
