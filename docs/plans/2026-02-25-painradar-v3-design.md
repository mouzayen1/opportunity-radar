# PainRadar v3 — Design Document

## Problem

OpportunityRadar v2 finds generic "opportunities" from community discussions. The signal-to-noise ratio is poor because it treats every complaint as an isolated item. PainRadar v3 replaces it entirely with a B2B software displeasure discovery engine that finds **specific named products with miserable paying customers**, cross-references complaints across platforms, and ranks products by disruption opportunity.

Core thesis: Don't invent demand. Steal it from products that already have it but are failing their customers.

## Decisions

- **Rebuild in-place** inside `opportunity-radar/` repo. Delete old `src/`, keep `.env.local`, `.github/` skeleton, git history, Supabase connection, Vercel project, GitHub Actions secrets.
- **Drop old DB tables** (`opportunities`, `collection_runs`). Create new PainRadar schema from scratch.
- **All 5 sources with graceful degradation.** G2 (RapidAPI), Capterra (cheerio), Trustpilot (cheerio), Reddit (JSON API), HN (Algolia). Flaky scrapers log failures and skip; dashboard works with whatever data flows through.
- **"Build This" AI summary** pre-computed during Stage 3 scoring job and stored on `products.build_this_summary`. No per-pageview Groq calls.

## Architecture

### Stack (all free tier)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL) |
| AI Analysis | Groq (llama-3.3-70b-versatile) |
| Data Collection | GitHub Actions (cron) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |

### Two-Level Data Model

The key architectural improvement: **products** (the thing being complained about) and **complaints** (individual data points linked to products). This enables cross-platform correlation and aggregation — the thing v2 couldn't do.

### 3-Stage Pipeline

1. **Collect** — 5 source collectors pull raw complaints into `complaints` table with `analyzed = false`
2. **Analyze** — Stage 1 keyword pre-filter (no AI cost) marks candidates → Stage 2 Groq extraction (product name, pain categories, severity, wishes, switching intent) → product name normalization → find-or-create product record
3. **Score** — Cross-platform signal detection → pain score + disruption score calculation → trending detection → "Build This" AI summary generation → update `products` aggregates

### GitHub Actions Schedule

| Workflow | Cron | Sources |
|----------|------|---------|
| collect-reviews.yml | `0 */6 * * *` (0:00, 6:00, 12:00, 18:00 UTC) | G2, Capterra, Trustpilot |
| collect-discussions.yml | `0 3,9,15,21 * * *` | Reddit, HN |
| analyze-and-score.yml | `0 6,18 * * *` | Stage 1 → Stage 2 → Stage 3 |

Analysis runs at 6:00/18:00 UTC, giving a buffer after collection jobs finish.

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `products` | Software being complained about. Aggregated scores, trending, platform count, `build_this_summary` field. |
| `complaints` | Individual data points from all 5 sources, linked to a product via `product_id`. AI-extracted fields. |
| `product_pain_summary` | Per-product, per-category aggregation (e.g. "ServiceTitan + pricing = 47 mentions, avg severity 8.2") |
| `cross_platform_signals` | Normalized complaint themes appearing on 2+ platforms |
| `collection_runs` | Job tracking per source with status, counts, errors |
| `monitored_categories` | Software verticals we scan (15 initial categories) |
| `saved_products` | Personal bookmarking/tracking |

### Key Fields on `products`

- `pain_score` (0-100): volume (25pts) + severity (25pts) + platform spread (25pts) + recency (25pts)
- `disruption_score` (0-100): switching intent (30pts) + pricing complaints (25pts) + feature gap specificity (25pts) + market accessibility (20pts)
- `trending_direction`: rising/falling/stable based on 30d vs 60d complaint counts
- `build_this_summary`: AI-generated synthesis of what a better product would look like (pre-computed in Stage 3)
- `search_vector` (TSVECTOR): auto-updated via trigger for full-text search

### Key Fields on `complaints`

- AI-extracted: `pain_categories[]`, `pain_summary`, `severity` (1-10), `wishes`, `specific_feature_gaps[]`, `competitor_mentions[]`, `switching_intent`
- Source metadata: `source`, `source_id`, `source_url`, `star_rating`, `author_role`, `author_company_size`

## Pain Category Taxonomy

10 categories: pricing, ux, support, reliability, features, onboarding, mobile, contracts, integrations, scaling. Each with keyword lists for Stage 1 filtering and color/icon for UI display.

## Collectors

| Collector | Method | Rate Limit | Failure Mode |
|-----------|--------|------------|-------------|
| HN | Algolia API (no key) | 100ms delay | Very reliable, basic retry |
| Reddit | Public JSON API | 2s delay, 429 exponential backoff | Retry 3x then skip |
| G2 | RapidAPI free tier (100 req/mo) | Budget-tracked per run | Log + skip |
| Capterra | Cheerio HTML scrape | 5s delay, UA rotation | Log 403/timeout + skip |
| Trustpilot | Cheerio HTML + JSON-LD | 3s delay | Log + skip |

### Product Name Normalization

Critical for cross-platform matching. Alias map (e.g. "qbo" → "quickbooks", "sfdc" → "salesforce") plus lowercase/strip normalization. `findOrCreateProduct()` ensures one canonical product record per software tool.

## Frontend

### Pages

**`/` — Main Dashboard**
- Stats bar: total products, total complaints, avg pain score, trending count
- Left sidebar filters: search, category, min pain/disruption score, platform count, pain category, trending, sort
- Product card grid: pain gauge, disruption gauge, platform badges, top 3 pain tags, trending indicator, price range, wishes summary
- Pagination

**`/product/[slug]` — Product Deep-Dive**
- Score overview with large gauges
- Pain category breakdown (bar chart)
- Platform distribution (pie chart)
- Complaint timeline (line chart, 90 days)
- "The Gap": wishes, feature gaps, competitor mentions
- Raw complaints feed with source badges
- "Build This" summary (pre-computed, displayed from DB)

**`/categories` — Browse by Vertical**
- Category grid with product count, avg pain score, top 3 most-hated

**`/trending` — Rising Pain Signals**
- Products sorted by trending_delta, 30d vs 60d comparison, newly appeared

### Design Language

- Dark mode default, light mode toggle
- Bloomberg Terminal meets modern SaaS — data-dense
- Pain score: 0-30 green, 31-60 yellow, 61-80 orange, 81-100 red
- Disruption score: higher = greener
- Source colors: G2 #FF492C, Capterra #06BEE1, Reddit #FF4500, HN #FF6600, Trustpilot #00B67A
- shadcn/ui + Lucide icons
- Mobile responsive (collapsible filter sidebar)
- ISR with 1-hour revalidation

## Build Phases

### Phase 1: Foundation
Project scaffold, DB schema + migration, Supabase client, TypeScript types, product name normalization, pain category taxonomy, shadcn/ui setup.

### Phase 2: Collectors + Pipeline
Build HN and Reddit collectors first. Get data flowing end-to-end through all 3 stages with just those two sources. Verify products appear with scores. Then add G2, Capterra, Trustpilot collectors.

### Phase 3: Frontend
Dashboard page, product deep-dive, categories, trending. All components (ProductCard, PainScoreGauge, ComplaintTimeline, etc.). Filters, search, responsive layout, dark/light mode.

### Phase 4: Automation + Polish
GitHub Actions workflows, seed categories script, ISR config, loading/empty/error states, final QA.

## Cost

| Service | Free Tier | Projected Usage | Cost |
|---------|-----------|----------------|------|
| Vercel | 100GB bandwidth | ~5GB/mo | $0 |
| Supabase | 500MB DB, 2GB bandwidth | ~200MB DB | $0 |
| Groq | 14,400 req/day | ~400/day | $0 |
| RapidAPI (G2) | 100 req/month | ~60/month | $0 |
| GitHub Actions | 2,000 min/month | ~600 min/month | $0 |
| **Total** | | | **$0/month** |
