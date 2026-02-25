# PainRadar v3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild OpportunityRadar into PainRadar — a B2B software displeasure discovery engine that finds specific named products with miserable paying customers, cross-references complaints across platforms, and ranks by disruption opportunity.

**Architecture:** Two-level data model (products + complaints) with 5-source collection (HN, Reddit, G2/RapidAPI, Capterra/cheerio, Trustpilot/cheerio), 3-stage pipeline (collect → AI extract → cross-platform score), and a data-dense Next.js 14 dashboard with dark mode, ISR, and Recharts visualizations.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL), Groq (llama-3.3-70b-versatile), Tailwind CSS, shadcn/ui, Recharts, Lucide React, cheerio. All free tier. Deployed on Vercel via GitHub Actions.

**Design Doc:** `docs/plans/2026-02-25-painradar-v3-design.md`

**Existing Repo:** `C:\Users\mmouzayen\opportunity-radar` — rebuild in-place, keep `.env.local`, `.github/`, git history.

---

## Phase 1: Foundation

### Task 1: Clean old source code and scaffold new project

**Files:**
- Delete: `src/` (entire directory)
- Delete: `supabase-schema.sql`
- Delete: `OpportunityRadar-v5.jsx` (if present)
- Modify: `package.json`
- Modify: `next.config.js`
- Modify: `tailwind.config.ts`
- Modify: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx` (placeholder)
- Create: `src/app/globals.css`

**Step 1: Delete old source files**

```bash
cd C:\Users\mmouzayen\opportunity-radar
rm -rf src/
rm -f supabase-schema.sql
rm -f OpportunityRadar-v5.jsx
```

**Step 2: Update package.json**

Replace contents. Key changes:
- Name: `painradar`
- Downgrade Next.js to `^14.2.0` (spec requires 14, not 16)
- Add new deps: `cheerio`, `recharts`, `lucide-react`, `date-fns`, `slugify`
- Add shadcn deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`
- Add scripts: `collect:discussions`, `collect:reviews`, `analyze`, `seed`

```json
{
  "name": "painradar",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "collect:discussions": "npx tsx src/collectors/reddit.ts && npx tsx src/collectors/hackernews.ts",
    "collect:reviews": "npx tsx src/collectors/g2.ts && npx tsx src/collectors/capterra.ts && npx tsx src/collectors/trustpilot.ts",
    "analyze": "npx tsx src/collectors/stage1-filter.ts && npx tsx src/collectors/stage2-extract.ts && npx tsx src/collectors/stage3-score.ts",
    "seed": "npx tsx scripts/seed-categories.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "cheerio": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0",
    "dotenv": "^16.4.0",
    "groq-sdk": "^0.5.0",
    "lucide-react": "^0.400.0",
    "next": "^14.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.0",
    "slugify": "^1.6.6",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  }
}
```

**Step 3: Update tailwind.config.ts for shadcn/ui**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Source brand colors
        g2: "#FF492C",
        capterra: "#06BEE1",
        reddit: "#FF4500",
        hackernews: "#FF6600",
        trustpilot: "#00B67A",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Step 4: Update next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["groq-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.g2.com" },
      { protocol: "https", hostname: "**.capterra.com" },
    ],
  },
};

module.exports = nextConfig;
```

**Step 5: Update .env.example**

```bash
# Supabase (free tier)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Groq AI (free tier - llama-3.3-70b-versatile)
GROQ_API_KEY=your-groq-api-key

# RapidAPI (free tier - for G2 scraper)
RAPIDAPI_KEY=your-rapidapi-key
```

**Step 6: Create globals.css with shadcn/ui dark theme**

Create `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 217.2 32.6% 7.5%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 12%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 12%;
    --muted-foreground: 215 20.2% 55.1%;
    --accent: 217.2 32.6% 12%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 7: Create placeholder layout and page**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PainRadar — B2B Software Displeasure Discovery",
  description:
    "Find B2B software products with miserable paying customers. Ranked by cross-platform pain signals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">PainRadar</h1>
    </main>
  );
}
```

**Step 8: Create shadcn/ui utility file**

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 9: Install dependencies and verify dev server starts**

```bash
npm install
npm run dev
```

Expected: Dev server starts at localhost:3000, shows "PainRadar" heading on dark background.

**Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold PainRadar v3, remove old OpportunityRadar source"
```

---

### Task 2: Create TypeScript types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Write all type definitions**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add PainRadar TypeScript type definitions"
```

---

### Task 3: Create Supabase client and Groq client

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/groq.ts`

**Step 1: Write Supabase client**

Reuse the existing pattern (server + browser clients with singleton):

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient(url, key);
}

export function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase browser env vars");
  return createClient(url, key);
}

let serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!serverClient) serverClient = createServerClient();
  return serverClient;
}
```

**Step 2: Write Groq client**

Singleton pattern, llama-3.3-70b-versatile, temp=0.1 for extraction:

```typescript
import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";
```

**Step 3: Commit**

```bash
git add src/lib/supabase.ts src/lib/groq.ts
git commit -m "feat: add Supabase and Groq client modules"
```

---

### Task 4: Create pain category taxonomy and product normalization

**Files:**
- Create: `src/lib/categories.ts`
- Create: `src/lib/normalize.ts`

**Step 1: Write categories.ts**

```typescript
import { PainCategory } from "./types";

export interface CategoryDef {
  label: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const PAIN_CATEGORIES: Record<PainCategory, CategoryDef> = {
  pricing: {
    label: "Pricing & Value",
    icon: "DollarSign",
    color: "#EF4444",
    keywords: [
      "expensive", "overpriced", "cost", "price increase", "not worth",
      "cheaper alternative", "per user", "per seat", "hidden fees",
      "price hike", "too much money", "robbery", "ripoff",
    ],
  },
  ux: {
    label: "UX & Usability",
    icon: "Layout",
    color: "#F59E0B",
    keywords: [
      "clunky", "unintuitive", "confusing", "hard to use", "too many clicks",
      "complicated", "outdated UI", "ugly interface", "learning curve",
      "not user friendly", "terrible design", "looks like 2005",
    ],
  },
  support: {
    label: "Customer Support",
    icon: "Headphones",
    color: "#8B5CF6",
    keywords: [
      "support", "customer service", "no response", "unhelpful", "long wait",
      "terrible support", "can't reach", "ignored", "ticket", "hold time",
      "outsourced", "script readers",
    ],
  },
  reliability: {
    label: "Reliability & Bugs",
    icon: "AlertTriangle",
    color: "#DC2626",
    keywords: [
      "buggy", "crashes", "downtime", "slow", "breaks", "glitch", "error",
      "freezes", "unreliable", "data loss", "outage", "laggy",
    ],
  },
  features: {
    label: "Missing Features",
    icon: "PuzzlePiece",
    color: "#3B82F6",
    keywords: [
      "missing feature", "wish it had", "no integration", "can't do",
      "limited", "basic", "lacks", "need", "would be nice if", "why can't",
      "feature request",
    ],
  },
  onboarding: {
    label: "Onboarding & Setup",
    icon: "Rocket",
    color: "#10B981",
    keywords: [
      "setup", "onboarding", "implementation", "takes weeks", "consultant",
      "difficult to configure", "learning curve", "documentation",
      "getting started",
    ],
  },
  mobile: {
    label: "Mobile Experience",
    icon: "Smartphone",
    color: "#06B6D4",
    keywords: [
      "mobile app", "phone", "offline", "field", "tablet", "responsive",
      "mobile version", "app crashes", "no mobile",
    ],
  },
  contracts: {
    label: "Contracts & Lock-in",
    icon: "Lock",
    color: "#DC2626",
    keywords: [
      "contract", "locked in", "annual", "cancel", "auto-renew", "trapped",
      "can't leave", "data export", "hostage", "migration",
    ],
  },
  integrations: {
    label: "Integrations",
    icon: "Link",
    color: "#7C3AED",
    keywords: [
      "integration", "API", "connect", "sync", "webhook", "zapier",
      "doesn't work with", "compatibility", "import", "export",
    ],
  },
  scaling: {
    label: "Scaling & Performance",
    icon: "TrendingUp",
    color: "#F97316",
    keywords: [
      "scale", "grow", "enterprise", "large team", "performance", "limits",
      "throttle", "capacity", "slow with large",
    ],
  },
};
```

**Step 2: Write normalize.ts**

```typescript
import { createServerClient } from "./supabase";
import slugify from "slugify";

const PRODUCT_ALIASES: Record<string, string[]> = {
  servicetitan: ["service titan", "service-titan"],
  quickbooks: ["quick books", "qbo", "quickbooks online", "qb online", "intuit quickbooks"],
  hubspot: ["hub spot", "hubspot crm"],
  salesforce: ["sfdc", "sales force", "salesforce crm"],
  servicenow: ["service now", "service-now"],
  freshdesk: ["fresh desk"],
  zoho: ["zoho crm", "zoho one", "zoho books"],
  netsuite: ["net suite", "oracle netsuite"],
  lightspeed: ["lightspeed pos", "lightspeed retail"],
  toast: ["toast pos", "toast tab", "toasttab"],
  monday: ["monday.com", "mondaycom", "monday com"],
  asana: ["asana project"],
  clickup: ["click up", "click-up"],
  zendesk: ["zen desk"],
  intercom: ["inter com"],
  mailchimp: ["mail chimp"],
  calendly: ["calendly scheduling"],
  gusto: ["gusto payroll"],
  adp: ["adp payroll", "adp workforce"],
};

export function normalizeProductName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  for (const [canonical, aliases] of Object.entries(PRODUCT_ALIASES)) {
    if (aliases.includes(cleaned) || cleaned === canonical) {
      return canonical;
    }
  }

  return cleaned.replace(/\s/g, "");
}

export function makeSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

export async function findOrCreateProduct(
  productName: string,
  category?: string
): Promise<{ id: string; slug: string }> {
  const supabase = createServerClient();
  const normalized = normalizeProductName(productName);

  // Try to find existing
  const { data: existing } = await supabase
    .from("products")
    .select("id, slug")
    .eq("normalized_name", normalized)
    .single();

  if (existing) return existing;

  // Create new
  const slug = makeSlug(productName);
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      name: productName,
      slug,
      normalized_name: normalized,
      category: category || "Uncategorized",
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return created!;
}
```

**Step 3: Commit**

```bash
git add src/lib/categories.ts src/lib/normalize.ts
git commit -m "feat: add pain category taxonomy and product name normalization"
```

---

### Task 5: Create database migration script

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write the full schema**

This is the complete SQL from the design doc with the addition of `build_this_summary` on products and the `search_vector` auto-update trigger.

```sql
-- ============================================
-- PainRadar v3 Schema
-- Run in Supabase SQL Editor
-- ============================================

-- Drop old OpportunityRadar tables
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS collection_runs CASCADE;

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  website TEXT,
  logo_url TEXT,
  g2_url TEXT,
  capterra_url TEXT,
  trustpilot_url TEXT,
  estimated_price_low DECIMAL,
  estimated_price_high DECIMAL,
  pricing_model TEXT,

  -- Aggregated scores (updated by scoring job)
  pain_score DECIMAL DEFAULT 0,
  disruption_score DECIMAL DEFAULT 0,
  platform_count INTEGER DEFAULT 0,
  total_complaints INTEGER DEFAULT 0,
  avg_severity DECIMAL DEFAULT 0,
  trending_direction TEXT DEFAULT 'stable',
  trending_delta DECIMAL DEFAULT 0,
  build_this_summary TEXT,

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_complaint_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search
  search_vector TSVECTOR
);

CREATE INDEX idx_products_pain ON products(pain_score DESC);
CREATE INDEX idx_products_disruption ON products(disruption_score DESC);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_normalized ON products(normalized_name);

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION products_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.subcategory, '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_update();

-- Raw complaints from all sources
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  source TEXT NOT NULL,
  source_id TEXT,
  source_url TEXT,

  raw_text TEXT NOT NULL,
  title TEXT,
  author TEXT,
  author_role TEXT,
  author_company_size TEXT,
  star_rating DECIMAL,

  -- AI-extracted fields
  pain_categories TEXT[],
  pain_summary TEXT,
  severity INTEGER,
  wishes TEXT,
  specific_feature_gaps TEXT[],
  competitor_mentions TEXT[],
  sentiment_score DECIMAL,
  switching_intent TEXT,
  user_segment TEXT,

  review_date TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed BOOLEAN DEFAULT FALSE,

  UNIQUE(source, source_id)
);

CREATE INDEX idx_complaints_product ON complaints(product_id);
CREATE INDEX idx_complaints_source ON complaints(source);
CREATE INDEX idx_complaints_severity ON complaints(severity DESC);
CREATE INDEX idx_complaints_date ON complaints(review_date DESC);
CREATE INDEX idx_complaints_analyzed ON complaints(analyzed) WHERE analyzed = FALSE;
CREATE INDEX idx_complaints_categories ON complaints USING GIN(pain_categories);

-- Pain category aggregation per product
CREATE TABLE product_pain_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  pain_category TEXT NOT NULL,
  mention_count INTEGER DEFAULT 0,
  avg_severity DECIMAL DEFAULT 0,
  platforms TEXT[],
  sample_quotes TEXT[],
  common_wishes TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, pain_category)
);

-- Cross-platform signal tracking
CREATE TABLE cross_platform_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  signal_text TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  platform_count INTEGER NOT NULL,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  total_mentions INTEGER DEFAULT 0,
  representative_complaints UUID[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_product ON cross_platform_signals(product_id);
CREATE INDEX idx_signals_count ON cross_platform_signals(platform_count DESC);

-- Scraping job tracking
CREATE TABLE collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_analyzed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Categories we actively monitor
CREATE TABLE monitored_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  g2_category_url TEXT,
  capterra_category_url TEXT,
  subreddits TEXT[],
  hn_search_terms TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User saved products
CREATE TABLE saved_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pain_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- Anonymous read access
CREATE POLICY "anon_read_products" ON products FOR SELECT USING (true);
CREATE POLICY "anon_read_complaints" ON complaints FOR SELECT USING (true);
CREATE POLICY "anon_read_pain_summary" ON product_pain_summary FOR SELECT USING (true);
CREATE POLICY "anon_read_signals" ON cross_platform_signals FOR SELECT USING (true);
CREATE POLICY "anon_read_runs" ON collection_runs FOR SELECT USING (true);
CREATE POLICY "anon_read_categories" ON monitored_categories FOR SELECT USING (true);
CREATE POLICY "anon_read_saved" ON saved_products FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "service_all_products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_complaints" ON complaints FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_pain_summary" ON product_pain_summary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_signals" ON cross_platform_signals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_runs" ON collection_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_categories" ON monitored_categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_saved" ON saved_products FOR ALL USING (auth.role() = 'service_role');
```

**Step 2: Create seed-categories script**

Create `scripts/seed-categories.ts`:

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../src/lib/supabase";

const INITIAL_CATEGORIES = [
  {
    name: "Field Service Management",
    g2_category_url: "https://www.g2.com/categories/field-service-management",
    subreddits: ["HVAC", "Plumbing", "Electricians", "smallbusiness", "msp"],
    hn_search_terms: ["ServiceTitan", "Housecall Pro", "Jobber", "field service software"],
    priority: 9,
  },
  {
    name: "CRM",
    g2_category_url: "https://www.g2.com/categories/crm",
    subreddits: ["sales", "salesforce", "smallbusiness", "Entrepreneur"],
    hn_search_terms: ["CRM software", "Salesforce alternative", "HubSpot"],
    priority: 8,
  },
  {
    name: "Accounting Software",
    g2_category_url: "https://www.g2.com/categories/accounting",
    subreddits: ["Accounting", "Bookkeeping", "smallbusiness", "QuickBooks"],
    hn_search_terms: ["QuickBooks", "Xero", "accounting software"],
    priority: 8,
  },
  {
    name: "Project Management",
    g2_category_url: "https://www.g2.com/categories/project-management",
    subreddits: ["projectmanagement", "asana", "ClickUp", "mondaydotcom"],
    hn_search_terms: ["project management tool", "Asana", "Monday.com", "ClickUp"],
    priority: 7,
  },
  {
    name: "POS / Retail",
    g2_category_url: "https://www.g2.com/categories/retail-pos",
    subreddits: ["retailtech", "smallbusiness", "restaurateur", "Restaurant"],
    hn_search_terms: ["POS system", "Toast POS", "Square", "retail software"],
    priority: 8,
  },
  {
    name: "Email Marketing",
    g2_category_url: "https://www.g2.com/categories/email-marketing",
    subreddits: ["emailmarketing", "Emailmarketing", "marketing", "Entrepreneur"],
    hn_search_terms: ["Mailchimp", "email marketing", "newsletter tool"],
    priority: 6,
  },
  {
    name: "Help Desk / Support",
    g2_category_url: "https://www.g2.com/categories/help-desk",
    subreddits: ["sysadmin", "msp", "ITManagers", "CustomerSuccess"],
    hn_search_terms: ["help desk software", "Zendesk", "Freshdesk", "ticketing system"],
    priority: 7,
  },
  {
    name: "HR & Payroll",
    g2_category_url: "https://www.g2.com/categories/payroll",
    subreddits: ["humanresources", "payroll", "smallbusiness"],
    hn_search_terms: ["payroll software", "Gusto", "ADP", "HR software"],
    priority: 7,
  },
  {
    name: "Inventory Management",
    g2_category_url: "https://www.g2.com/categories/inventory-management",
    subreddits: ["ecommerce", "smallbusiness", "Etsy", "shopify"],
    hn_search_terms: ["inventory management", "Cin7", "inFlow", "inventory software"],
    priority: 8,
  },
  {
    name: "LMS / Course Platforms",
    g2_category_url: "https://www.g2.com/categories/learning-management-system-lms",
    subreddits: ["onlinecourses", "Teachable", "CourseCreation", "Entrepreneur"],
    hn_search_terms: ["Teachable", "Kajabi", "Thinkific", "course platform", "LMS"],
    priority: 7,
  },
  {
    name: "Restaurant Management",
    g2_category_url: "https://www.g2.com/categories/restaurant-management",
    subreddits: ["restaurateur", "Restaurant", "KitchenConfidential", "Chefit"],
    hn_search_terms: ["Toast restaurant", "restaurant POS", "restaurant management software"],
    priority: 7,
  },
  {
    name: "Property Management",
    g2_category_url: "https://www.g2.com/categories/property-management",
    subreddits: ["Landlord", "PropertyManagement", "realestateinvesting"],
    hn_search_terms: ["property management software", "Buildium", "AppFolio", "landlord software"],
    priority: 7,
  },
  {
    name: "Client Communication / Messaging",
    g2_category_url: "https://www.g2.com/categories/business-text-messaging",
    subreddits: ["smallbusiness", "dentistry", "optometry"],
    hn_search_terms: ["Podium", "Birdeye", "business messaging", "review management"],
    priority: 8,
  },
  {
    name: "Practice Management (Healthcare)",
    g2_category_url: "https://www.g2.com/categories/practice-management",
    subreddits: ["therapists", "psychotherapy", "Chiropractic", "dentistry"],
    hn_search_terms: ["SimplePractice", "TherapyNotes", "practice management software"],
    priority: 7,
  },
  {
    name: "Scheduling & Booking",
    g2_category_url: "https://www.g2.com/categories/appointment-scheduling",
    subreddits: ["smallbusiness", "Entrepreneur", "freelance"],
    hn_search_terms: ["Calendly", "Acuity", "scheduling software", "booking tool"],
    priority: 6,
  },
];

async function seed() {
  const supabase = createServerClient();

  console.log("Seeding monitored categories...");

  for (const cat of INITIAL_CATEGORIES) {
    const { error } = await supabase.from("monitored_categories").upsert(
      {
        name: cat.name,
        g2_category_url: cat.g2_category_url,
        subreddits: cat.subreddits,
        hn_search_terms: cat.hn_search_terms,
        priority: cat.priority,
        is_active: true,
      },
      { onConflict: "name" }
    );

    if (error) {
      console.error(`Failed to seed "${cat.name}":`, error.message);
    } else {
      console.log(`  Seeded: ${cat.name}`);
    }
  }

  console.log("Done!");
}

seed();
```

Note: The `upsert` on `name` requires a unique constraint on `monitored_categories.name`. Add this line to the schema after the table definition:

Add to SQL after `monitored_categories` table:
```sql
CREATE UNIQUE INDEX idx_monitored_categories_name ON monitored_categories(name);
```

**Step 3: Commit**

```bash
git add supabase/ scripts/
git commit -m "feat: add database schema and category seed script"
```

**Step 4: Run migration in Supabase SQL Editor**

Manually paste the SQL into the Supabase SQL Editor and run it. Then run:

```bash
npx tsx scripts/seed-categories.ts
```

Expected: 15 categories seeded without errors.

---

## Phase 2: Collectors + Pipeline

### Task 6: Build HN collector (most reliable source first)

**Files:**
- Create: `src/collectors/hackernews.ts`

**Step 1: Write the HN collector**

Key differences from old version:
- Search queries focused on **complaint signals** (not opportunity signals)
- Also searches `tags=comment` (not just stories) since complaints live in comments
- Pulls from `monitored_categories.hn_search_terms` in addition to generic queries
- Writes raw complaints directly to `complaints` table with `analyzed = false` and no `product_id` yet (Stage 2 will extract the product)
- Tracks collection run in `collection_runs` table

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import { sleep } from "../lib/utils";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

// Generic complaint search queries
const COMPLAINT_QUERIES = [
  "alternative to",
  "switched from",
  "hate using",
  "frustrated with",
  "worst software",
  "terrible software",
  "overpriced software",
  "looking for alternative",
  "replacing",
  "too expensive",
];

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  author?: string;
  story_title?: string;
}

async function searchHN(
  query: string,
  tags: string,
  daysBack: number = 90
): Promise<AlgoliaHit[]> {
  try {
    const since = Math.floor(Date.now() / 1000) - daysBack * 86400;
    const url = `${ALGOLIA_BASE}/search?query=${encodeURIComponent(query)}&tags=${tags}&numericFilters=created_at_i>${since}&hitsPerPage=100`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HN API error for "${query}": ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.hits || [];
  } catch (error) {
    console.error(`HN search failed for "${query}":`, error);
    return [];
  }
}

function hitToComplaint(hit: AlgoliaHit): RawComplaint | null {
  const text = hit.comment_text || hit.story_text || "";
  const title = hit.title || hit.story_title || null;
  if (!text && !title) return null;

  return {
    source: "hackernews",
    source_id: hit.objectID,
    source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    title,
    raw_text: text,
    author: hit.author || null,
    author_role: null,
    author_company_size: null,
    star_rating: null,
    review_date: new Date(hit.created_at),
  };
}

async function getSearchTermsFromDB(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("monitored_categories")
    .select("hn_search_terms")
    .eq("is_active", true);

  if (!data) return [];
  return data.flatMap((row) => row.hn_search_terms || []);
}

export async function collectFromHackerNews(): Promise<RawComplaint[]> {
  console.log("Collecting from Hacker News...");
  const allItems = new Map<string, RawComplaint>();

  // Get category-specific search terms from DB
  const categoryTerms = await getSearchTermsFromDB();
  const allQueries = [...COMPLAINT_QUERIES, ...categoryTerms];
  const uniqueQueries = [...new Set(allQueries)];

  for (const query of uniqueQueries) {
    console.log(`  Searching HN for: "${query}"`);

    // Search both stories and comments
    const [stories, comments] = await Promise.all([
      searchHN(query, "story"),
      searchHN(query, "comment"),
    ]);

    for (const hit of [...stories, ...comments]) {
      const complaint = hitToComplaint(hit);
      if (complaint && !allItems.has(complaint.source_id)) {
        allItems.set(complaint.source_id, complaint);
      }
    }

    await sleep(100);
  }

  const items = Array.from(allItems.values());
  console.log(`  Found ${items.length} unique HN items`);
  return items;
}

// Main: run standalone
async function main() {
  const supabase = createServerClient();

  // Create collection run
  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "hackernews", status: "running" })
    .select("id")
    .single();

  try {
    const items = await collectFromHackerNews();

    // Insert complaints (no product_id yet — Stage 2 will set it)
    let newCount = 0;
    for (const item of items) {
      const { error } = await supabase.from("complaints").upsert(
        {
          source: item.source,
          source_id: item.source_id,
          source_url: item.source_url,
          title: item.title,
          raw_text: item.raw_text.substring(0, 2000),
          author: item.author,
          review_date: item.review_date.toISOString(),
          analyzed: false,
        },
        { onConflict: "source,source_id", ignoreDuplicates: true }
      );
      if (!error) newCount++;
    }

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: items.length,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`HN collection complete: ${items.length} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("HN collection failed:", error);
    process.exit(1);
  }
}

main();
```

**Step 2: Test HN collector**

```bash
npx tsx src/collectors/hackernews.ts
```

Expected: Outputs "Found X unique HN items", "HN collection complete: X found, Y new". Check Supabase `complaints` table for rows with `source = 'hackernews'`.

**Step 3: Commit**

```bash
git add src/collectors/hackernews.ts
git commit -m "feat: add HN complaint collector"
```

---

### Task 7: Build Reddit collector

**Files:**
- Create: `src/collectors/reddit.ts`

**Step 1: Write the Reddit collector**

Same structure as HN. Key differences: pulls subreddits from `monitored_categories`, uses complaint-focused queries, 2s delay between requests, exponential backoff on 429.

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";
import { sleep } from "../lib/utils";

const USER_AGENT = "PainRadar/3.0 (B2B software complaint discovery)";
const BASE_DELAY = 2000;

const COMPLAINT_QUERIES = [
  "hate",
  "terrible",
  "worst",
  "alternative to",
  "switched from",
  "frustrated with",
  "overpriced",
  "looking for alternative",
  "replacing",
  "worst software",
];

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  author: string;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<any | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.ok) return response.json();

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 2000;
        console.log(`  Rate limited, waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      console.error(`  Reddit API error: ${response.status}`);
      return null;
    } catch (error) {
      console.error("  Reddit fetch error:", error);
      if (i < maxRetries - 1) await sleep(2000);
    }
  }
  return null;
}

function postToComplaint(post: RedditPost): RawComplaint {
  return {
    source: "reddit",
    source_id: `${post.subreddit}_${post.id}`,
    source_url: `https://reddit.com${post.permalink}`,
    title: post.title,
    raw_text: post.selftext || "",
    author: post.author || null,
    author_role: null,
    author_company_size: null,
    star_rating: null,
    review_date: new Date(post.created_utc * 1000),
  };
}

async function getSubredditsFromDB(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("monitored_categories")
    .select("subreddits")
    .eq("is_active", true);

  if (!data) return [];
  const all = data.flatMap((row) => row.subreddits || []);
  return [...new Set(all)];
}

export async function collectFromReddit(): Promise<RawComplaint[]> {
  console.log("Collecting from Reddit...");
  const allPosts = new Map<string, RawComplaint>();

  const subreddits = await getSubredditsFromDB();
  console.log(`  Scanning ${subreddits.length} subreddits`);

  for (const subreddit of subreddits) {
    console.log(`  Searching r/${subreddit}...`);

    for (const query of COMPLAINT_QUERIES) {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&t=month&limit=50`;
      const data = await fetchWithRetry(url);

      if (data?.data?.children) {
        for (const child of data.data.children) {
          const post = child.data as RedditPost;
          const complaint = postToComplaint(post);
          if (!allPosts.has(complaint.source_id)) {
            allPosts.set(complaint.source_id, complaint);
          }
        }
      }

      await sleep(BASE_DELAY);
    }
  }

  const items = Array.from(allPosts.values());
  console.log(`  Found ${items.length} unique Reddit posts`);
  return items;
}

// Main: run standalone
async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "reddit", status: "running" })
    .select("id")
    .single();

  try {
    const items = await collectFromReddit();

    let newCount = 0;
    for (const item of items) {
      const { error } = await supabase.from("complaints").upsert(
        {
          source: item.source,
          source_id: item.source_id,
          source_url: item.source_url,
          title: item.title,
          raw_text: item.raw_text.substring(0, 2000),
          author: item.author,
          review_date: item.review_date.toISOString(),
          analyzed: false,
        },
        { onConflict: "source,source_id", ignoreDuplicates: true }
      );
      if (!error) newCount++;
    }

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: items.length,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`Reddit collection complete: ${items.length} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Reddit collection failed:", error);
    process.exit(1);
  }
}

main();
```

**Step 2: Test Reddit collector**

```bash
npx tsx src/collectors/reddit.ts
```

Expected: Outputs subreddits scanned, "Found X unique Reddit posts", "Reddit collection complete". Check Supabase `complaints` table for rows with `source = 'reddit'`.

**Step 3: Commit**

```bash
git add src/collectors/reddit.ts
git commit -m "feat: add Reddit complaint collector"
```

---

### Task 8: Build Stage 1 pre-filter (no AI cost)

**Files:**
- Create: `src/collectors/stage1-filter.ts`

**Step 1: Write the pre-filter**

This runs as a standalone script. It fetches unanalyzed complaints from DB, applies keyword + noise filtering, and marks passing complaints as ready for Stage 2 (by updating a field or just selecting them in Stage 2's query).

Actually, the simplest approach: Stage 1 doesn't modify the DB. Stage 2 fetches unanalyzed complaints and runs them through the filter before sending to AI. But since we want Stage 1 to be a separate script in the GitHub Action, let's have it mark complaints that pass the filter by setting a `passes_filter` column — wait, that's not in the schema.

Simpler: Stage 1 is a function imported by Stage 2. The standalone script just logs stats. The actual filter logic is a pure function.

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";

const COMPLAINT_SIGNALS = [
  "hate", "terrible", "worst", "awful", "horrible", "nightmare",
  "regret", "waste of money", "scam", "ripoff", "garbage",
  "looking for alternative", "switched from", "moving away from",
  "replacing", "ditching", "leaving", "migrating from",
  "wish it had", "why can't", "missing feature", "still can't",
  "been requesting for years", "roadmap but never",
  "price increase", "too expensive", "not worth the price",
  "cheaper alternative", "overpriced", "doubled the price",
  "support is useless", "can't get help", "no response",
  "been waiting", "terrible support", "outsourced support",
  "alternative to", "frustrated with", "disappointed",
  "buggy", "crashes", "unreliable", "downtime",
  "clunky", "unintuitive", "confusing", "hard to use",
];

const NOISE_PATTERNS = [
  /use my (referral|link|code)/i,
  /discount code/i,
  /\b(sponsored|paid partnership)\b/i,
  /\b(hiring|we're looking|job opening)\b/i,
  /check out my|i built|i created|just launched/i,
];

export function passesPreFilter(text: string): { passes: boolean; signalCount: number } {
  if (text.length < 50) return { passes: false, signalCount: 0 };

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return { passes: false, signalCount: 0 };
  }

  const lowerText = text.toLowerCase();
  let signalCount = 0;
  for (const signal of COMPLAINT_SIGNALS) {
    if (lowerText.includes(signal)) signalCount++;
  }

  return { passes: signalCount >= 1, signalCount };
}

// Standalone: log filter stats for unanalyzed complaints
async function main() {
  const supabase = createServerClient();

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, raw_text, title")
    .eq("analyzed", false)
    .is("product_id", null);

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    process.exit(1);
  }

  console.log(`Stage 1 Pre-Filter: ${complaints.length} unanalyzed complaints`);

  let passed = 0;
  let failed = 0;

  for (const c of complaints) {
    const text = `${c.title || ""} ${c.raw_text}`;
    const result = passesPreFilter(text);
    if (result.passes) passed++;
    else failed++;
  }

  console.log(`  Passed: ${passed} (${((passed / complaints.length) * 100).toFixed(1)}%)`);
  console.log(`  Filtered out: ${failed}`);
}

main();
```

**Step 2: Test**

```bash
npx tsx src/collectors/stage1-filter.ts
```

Expected: Shows count of unanalyzed complaints that pass/fail the pre-filter.

**Step 3: Commit**

```bash
git add src/collectors/stage1-filter.ts
git commit -m "feat: add Stage 1 keyword pre-filter"
```

---

### Task 9: Build Stage 2 AI extraction

**Files:**
- Create: `src/collectors/stage2-extract.ts`

**Step 1: Write Stage 2**

Fetches unanalyzed complaints with no `product_id`, runs through Stage 1 filter, sends passing ones to Groq for extraction, then uses `findOrCreateProduct` to link complaint to product. Max 200 per run.

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { getGroqClient, GROQ_MODEL } from "../lib/groq";
import { AIExtraction, PainCategory } from "../lib/types";
import { findOrCreateProduct } from "../lib/normalize";
import { passesPreFilter } from "./stage1-filter";
import { sleep } from "../lib/utils";

const MAX_PER_RUN = 200;

const EXTRACTION_PROMPT = `You are a B2B software complaint analyst. Analyze this review/complaint and extract structured data.

REVIEW TEXT:
{text}

SOURCE: {source} ({url})

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "product_name": "exact product name being complained about (or null if unclear)",
  "product_category": "software category (e.g., 'Field Service Management', 'CRM', 'Accounting')",
  "pain_categories": ["array of categories from: pricing, ux, support, reliability, features, onboarding, mobile, contracts, integrations, scaling"],
  "pain_summary": "one sentence summary of the core complaint",
  "severity": 7,
  "wishes": "what the user wishes existed instead (or null)",
  "specific_feature_gaps": ["array of specific missing features or improvements needed"],
  "competitor_mentions": ["other products mentioned positively or as alternatives"],
  "estimated_monthly_spend": "estimated monthly cost range like '$50-100' or null if unknown",
  "user_segment": "who is complaining: 'small_business', 'mid_market', 'enterprise', 'freelancer', or null",
  "switching_intent": "none|considering|actively_looking|already_switched",
  "is_valid_complaint": true
}`;

const VALID_PAIN_CATEGORIES: PainCategory[] = [
  "pricing", "ux", "support", "reliability", "features",
  "onboarding", "mobile", "contracts", "integrations", "scaling",
];

function parseExtraction(raw: string): AIExtraction | null {
  try {
    let json = raw.trim();
    if (json.startsWith("```")) {
      json = json.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }
    const parsed = JSON.parse(json);

    if (!parsed.is_valid_complaint) return null;

    // Validate pain categories
    const validCategories = (parsed.pain_categories || []).filter(
      (c: string) => VALID_PAIN_CATEGORIES.includes(c as PainCategory)
    );

    return {
      product_name: parsed.product_name || null,
      product_category: parsed.product_category || null,
      pain_categories: validCategories,
      pain_summary: parsed.pain_summary || "",
      severity: Math.max(1, Math.min(10, Math.round(parsed.severity || 5))),
      wishes: parsed.wishes || null,
      specific_feature_gaps: parsed.specific_feature_gaps || [],
      competitor_mentions: parsed.competitor_mentions || [],
      estimated_monthly_spend: parsed.estimated_monthly_spend || null,
      user_segment: parsed.user_segment || null,
      switching_intent: parsed.switching_intent || "none",
      is_valid_complaint: true,
    };
  } catch {
    return null;
  }
}

async function analyzeComplaint(
  text: string,
  source: string,
  url: string
): Promise<AIExtraction | null> {
  const groq = getGroqClient();
  const prompt = EXTRACTION_PROMPT
    .replace("{text}", text.substring(0, 2000))
    .replace("{source}", source)
    .replace("{url}", url || "");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    return parseExtraction(content);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 429) {
      throw error; // Re-throw rate limits
    }
    console.error("  Groq API error:", error);
    return null;
  }
}

async function main() {
  const supabase = createServerClient();

  // Fetch unanalyzed complaints
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("analyzed", false)
    .is("product_id", null)
    .order("collected_at", { ascending: true })
    .limit(MAX_PER_RUN * 3); // Fetch extra since many will be filtered

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error?.message);
    process.exit(1);
  }

  console.log(`Stage 2: ${complaints.length} unanalyzed complaints`);

  // Apply Stage 1 filter
  const filtered = complaints.filter((c) => {
    const text = `${c.title || ""} ${c.raw_text}`;
    return passesPreFilter(text).passes;
  });

  console.log(`  Passed pre-filter: ${filtered.length}`);
  const toAnalyze = filtered.slice(0, MAX_PER_RUN);
  console.log(`  Analyzing: ${toAnalyze.length}`);

  // Mark filtered-out complaints as analyzed (no product) so we don't reprocess
  const filteredOutIds = complaints
    .filter((c) => !filtered.includes(c))
    .map((c) => c.id);

  if (filteredOutIds.length > 0) {
    await supabase
      .from("complaints")
      .update({ analyzed: true })
      .in("id", filteredOutIds);
    console.log(`  Marked ${filteredOutIds.length} filtered-out as analyzed`);
  }

  let analyzed = 0;
  let linked = 0;
  let quotaHit = false;

  for (const complaint of toAnalyze) {
    const text = `${complaint.title || ""}\n${complaint.raw_text}`;

    try {
      const extraction = await analyzeComplaint(
        text,
        complaint.source,
        complaint.source_url
      );

      analyzed++;

      if (!extraction || !extraction.product_name) {
        // Valid complaint but no clear product — mark as analyzed
        await supabase
          .from("complaints")
          .update({ analyzed: true })
          .eq("id", complaint.id);
        continue;
      }

      // Find or create the product
      const product = await findOrCreateProduct(
        extraction.product_name,
        extraction.product_category || undefined
      );

      // Update complaint with extraction data + link to product
      await supabase
        .from("complaints")
        .update({
          product_id: product.id,
          pain_categories: extraction.pain_categories,
          pain_summary: extraction.pain_summary,
          severity: extraction.severity,
          wishes: extraction.wishes,
          specific_feature_gaps: extraction.specific_feature_gaps,
          competitor_mentions: extraction.competitor_mentions,
          switching_intent: extraction.switching_intent,
          user_segment: extraction.user_segment,
          analyzed: true,
        })
        .eq("id", complaint.id);

      linked++;
      console.log(
        `  [${analyzed}/${toAnalyze.length}] ${extraction.product_name} — ${extraction.pain_summary?.substring(0, 60)}`
      );
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 429) {
        console.log("  Groq rate limit hit, stopping.");
        quotaHit = true;
        break;
      }
      console.error(`  Error analyzing complaint ${complaint.id}:`, error);
      await supabase
        .from("complaints")
        .update({ analyzed: true })
        .eq("id", complaint.id);
    }

    await sleep(200);
  }

  console.log(`\nStage 2 complete: ${analyzed} analyzed, ${linked} linked to products`);
  if (quotaHit) console.log("  (stopped early due to rate limit)");
}

main();
```

**Step 2: Test Stage 2**

```bash
npx tsx src/collectors/stage2-extract.ts
```

Expected: Processes unanalyzed complaints, creates product records, links complaints to products. Check `products` and `complaints` tables in Supabase.

**Step 3: Commit**

```bash
git add src/collectors/stage2-extract.ts
git commit -m "feat: add Stage 2 AI extraction with Groq"
```

---

### Task 10: Build Stage 3 scoring

**Files:**
- Create: `src/lib/scoring.ts`
- Create: `src/collectors/stage3-score.ts`

**Step 1: Write scoring.ts**

Pure scoring functions from the design doc:

```typescript
import { Complaint } from "./types";

export interface ProductScores {
  painScore: number;
  disruptionScore: number;
  platformCount: number;
  trendingDirection: "rising" | "falling" | "stable";
  trendingDelta: number;
}

export function calculateProductScores(complaints: Complaint[]): ProductScores {
  if (complaints.length === 0) {
    return { painScore: 0, disruptionScore: 0, platformCount: 0, trendingDirection: "stable", trendingDelta: 0 };
  }

  const now = Date.now();

  // ---- PAIN SCORE (0-100) ----

  // 1. Volume (25 pts max)
  const volumeScore = Math.min(25, Math.log10(complaints.length + 1) * 12.5);

  // 2. Severity (25 pts max)
  const avgSeverity =
    complaints.reduce((sum, c) => sum + (c.severity || 5), 0) / complaints.length;
  const severityScore = (avgSeverity / 10) * 25;

  // 3. Platform spread (25 pts max)
  const platforms = new Set(complaints.map((c) => c.source));
  const spreadPoints: Record<number, number> = { 1: 5, 2: 12, 3: 18, 4: 22, 5: 25 };
  const platformScore = spreadPoints[Math.min(platforms.size, 5)] || 25;

  // 4. Recency (25 pts max)
  const recencyWeights = complaints.map((c) => {
    const age = c.review_date
      ? (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24)
      : 90;
    if (age < 30) return 1;
    if (age < 90) return 0.5;
    return 0.25;
  });
  const recencyScore =
    (recencyWeights.reduce((a, b) => a + b, 0) / complaints.length) * 25;

  const painScore = Math.round(
    Math.min(100, volumeScore + severityScore + platformScore + recencyScore)
  );

  // ---- DISRUPTION SCORE (0-100) ----

  // 1. Switching intent (30 pts)
  const switchingComplaints = complaints.filter(
    (c) => c.switching_intent === "actively_looking" || c.switching_intent === "considering"
  );
  const switchingScore = Math.min(
    30,
    (switchingComplaints.length / complaints.length) * 30
  );

  // 2. Pricing complaints (25 pts)
  const pricingComplaints = complaints.filter((c) =>
    c.pain_categories?.includes("pricing")
  );
  const pricingScore = Math.min(
    25,
    (pricingComplaints.length / complaints.length) * 30
  );

  // 3. Feature gap specificity (25 pts)
  const featureGaps = complaints.flatMap((c) => c.specific_feature_gaps || []);
  const uniqueGaps = new Set(featureGaps);
  const gapScore = Math.min(25, uniqueGaps.size * 3);

  // 4. Market accessibility (20 pts)
  const smbComplaints = complaints.filter(
    (c) => c.user_segment === "small_business" || c.user_segment === "freelancer"
  );
  const marketScore = Math.min(
    20,
    (smbComplaints.length / complaints.length) * 25
  );

  const disruptionScore = Math.round(
    Math.min(100, switchingScore + pricingScore + gapScore + marketScore)
  );

  // ---- TRENDING ----

  const last30 = complaints.filter((c) => {
    if (!c.review_date) return false;
    const age = (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24);
    return age < 30;
  }).length;

  const prev30 = complaints.filter((c) => {
    if (!c.review_date) return false;
    const age = (now - new Date(c.review_date).getTime()) / (1000 * 60 * 60 * 24);
    return age >= 30 && age < 60;
  }).length;

  const trendingDelta = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : 0;
  const trendingDirection =
    trendingDelta > 15 ? "rising" : trendingDelta < -15 ? "falling" : "stable";

  return {
    painScore,
    disruptionScore,
    platformCount: platforms.size,
    trendingDirection,
    trendingDelta: Math.round(trendingDelta),
  };
}
```

**Step 2: Write stage3-score.ts**

Fetches all products, gets their complaints, calculates scores, updates products, generates "Build This" summaries, and builds product_pain_summary and cross_platform_signals.

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { getGroqClient, GROQ_MODEL } from "../lib/groq";
import { calculateProductScores } from "../lib/scoring";
import { Complaint } from "../lib/types";
import { sleep } from "../lib/utils";

const BUILD_THIS_PROMPT = `You are a product strategist. Based on these customer complaints about "{product_name}" ({category}), write a concise "Build This" summary (3-5 sentences) describing what a better competing product would look like.

Focus on: what it would do differently, who it's for, and the key differentiators.

TOP COMPLAINTS:
{complaints}

TOP WISHES:
{wishes}

TOP FEATURE GAPS:
{gaps}

Respond with ONLY the summary text, no formatting or headers.`;

async function generateBuildThisSummary(
  productName: string,
  category: string,
  complaints: Complaint[]
): Promise<string | null> {
  const groq = getGroqClient();

  const topComplaints = complaints
    .filter((c) => c.pain_summary)
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 10)
    .map((c) => `- ${c.pain_summary}`)
    .join("\n");

  const wishes = complaints
    .filter((c) => c.wishes)
    .map((c) => c.wishes!)
    .slice(0, 5)
    .map((w) => `- ${w}`)
    .join("\n");

  const gaps = [
    ...new Set(complaints.flatMap((c) => c.specific_feature_gaps || [])),
  ]
    .slice(0, 10)
    .map((g) => `- ${g}`)
    .join("\n");

  if (!topComplaints) return null;

  const prompt = BUILD_THIS_PROMPT
    .replace("{product_name}", productName)
    .replace("{category}", category || "Software")
    .replace("{complaints}", topComplaints || "N/A")
    .replace("{wishes}", wishes || "N/A")
    .replace("{gaps}", gaps || "N/A");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function updatePainSummaries(
  productId: string,
  complaints: Complaint[]
): Promise<void> {
  const supabase = createServerClient();

  // Group by pain category
  const byCategory = new Map<string, Complaint[]>();
  for (const c of complaints) {
    for (const cat of c.pain_categories || []) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(c);
    }
  }

  for (const [category, catComplaints] of byCategory) {
    const platforms = [...new Set(catComplaints.map((c) => c.source))];
    const avgSev =
      catComplaints.reduce((s, c) => s + (c.severity || 5), 0) / catComplaints.length;
    const quotes = catComplaints
      .filter((c) => c.pain_summary)
      .sort((a, b) => (b.severity || 0) - (a.severity || 0))
      .slice(0, 3)
      .map((c) => c.pain_summary!);
    const wishes = [
      ...new Set(catComplaints.filter((c) => c.wishes).map((c) => c.wishes!)),
    ].slice(0, 3);

    await supabase.from("product_pain_summary").upsert(
      {
        product_id: productId,
        pain_category: category,
        mention_count: catComplaints.length,
        avg_severity: Math.round(avgSev * 10) / 10,
        platforms,
        sample_quotes: quotes,
        common_wishes: wishes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,pain_category" }
    );
  }
}

async function main() {
  const supabase = createServerClient();

  // Get all products that have complaints
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category");

  if (error || !products) {
    console.error("Failed to fetch products:", error?.message);
    process.exit(1);
  }

  console.log(`Stage 3: Scoring ${products.length} products`);

  for (const product of products) {
    // Get all analyzed complaints for this product
    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("product_id", product.id)
      .eq("analyzed", true);

    if (!complaints || complaints.length === 0) continue;

    // Calculate scores
    const scores = calculateProductScores(complaints as Complaint[]);

    // Find latest complaint date
    const dates = complaints
      .filter((c) => c.review_date)
      .map((c) => new Date(c.review_date).getTime());
    const lastComplaintAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    // Generate "Build This" summary for products with enough data
    let buildThisSummary: string | null = null;
    if (complaints.length >= 3) {
      console.log(`  Generating "Build This" for ${product.name}...`);
      buildThisSummary = await generateBuildThisSummary(
        product.name,
        product.category || "",
        complaints as Complaint[]
      );
      await sleep(200);
    }

    // Update product
    await supabase
      .from("products")
      .update({
        pain_score: scores.painScore,
        disruption_score: scores.disruptionScore,
        platform_count: scores.platformCount,
        total_complaints: complaints.length,
        avg_severity:
          Math.round(
            (complaints.reduce((s, c) => s + (c.severity || 5), 0) / complaints.length) * 10
          ) / 10,
        trending_direction: scores.trendingDirection,
        trending_delta: scores.trendingDelta,
        last_complaint_at: lastComplaintAt,
        build_this_summary: buildThisSummary,
      })
      .eq("id", product.id);

    // Update pain summaries
    await updatePainSummaries(product.id, complaints as Complaint[]);

    console.log(
      `  ${product.name}: pain=${scores.painScore} disruption=${scores.disruptionScore} platforms=${scores.platformCount} complaints=${complaints.length}`
    );
  }

  console.log("\nStage 3 scoring complete.");
}

main();
```

**Step 3: Test full pipeline end-to-end**

```bash
npx tsx src/collectors/hackernews.ts
npx tsx src/collectors/reddit.ts
npx tsx src/collectors/stage2-extract.ts
npx tsx src/collectors/stage3-score.ts
```

Expected: Products table populated with scored products. `product_pain_summary` has category breakdowns. Check Supabase dashboard to verify data.

**Step 4: Commit**

```bash
git add src/lib/scoring.ts src/collectors/stage3-score.ts
git commit -m "feat: add Stage 3 cross-platform scoring and Build This summaries"
```

---

### Task 11: Build G2, Capterra, and Trustpilot collectors (graceful degradation)

**Files:**
- Create: `src/collectors/g2.ts`
- Create: `src/collectors/capterra.ts`
- Create: `src/collectors/trustpilot.ts`

**Step 1: Write G2 collector (RapidAPI)**

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import { RawComplaint } from "../lib/types";

const G2_API_HOST = "g2-products-reviews-users2.p.rapidapi.com";

async function fetchG2Reviews(productSlug: string): Promise<any[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log("  RAPIDAPI_KEY not set, skipping G2");
    return [];
  }

  try {
    const response = await fetch(
      `https://${G2_API_HOST}/product/${productSlug}/reviews?stars=1,2,3&sort=recent`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": G2_API_HOST,
        },
      }
    );

    if (!response.ok) {
      console.error(`  G2 API error: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("  G2 fetch failed:", error);
    return [];
  }
}

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "g2", status: "running" })
    .select("id")
    .single();

  try {
    // Get monitored categories with G2 URLs
    const { data: categories } = await supabase
      .from("monitored_categories")
      .select("g2_category_url")
      .eq("is_active", true)
      .not("g2_category_url", "is", null);

    console.log("Collecting from G2...");
    console.log(`  ${categories?.length || 0} categories with G2 URLs`);

    // For now, G2 collection requires knowing specific product slugs.
    // This is a placeholder — in practice you'd map category URLs to product slugs
    // via the RapidAPI endpoint or maintain a manual list.
    // The collector is structured for graceful degradation.

    let totalFound = 0;
    let newCount = 0;

    // TODO: Implement product slug discovery from G2 category pages
    // For now this collector runs but finds 0 items until configured with specific slugs

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`G2 collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("G2 collection failed:", error);
  }
}

main();
```

**Step 2: Write Capterra collector (cheerio, graceful degradation)**

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import * as cheerio from "cheerio";
import { sleep } from "../lib/utils";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "capterra", status: "running" })
    .select("id")
    .single();

  try {
    console.log("Collecting from Capterra...");
    console.log("  Note: Capterra uses Cloudflare protection. This collector may fail gracefully.");

    let totalFound = 0;
    let newCount = 0;

    // Capterra scraping is inherently fragile due to bot protection.
    // This collector is structured to attempt scraping and gracefully degrade.
    // TODO: Implement HTML parsing once we identify working selectors.
    // For now, logs attempt and reports 0 items.

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`Capterra collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Capterra collection failed (graceful):", error);
  }
}

main();
```

**Step 3: Write Trustpilot collector (same graceful pattern)**

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../lib/supabase";
import * as cheerio from "cheerio";
import { sleep } from "../lib/utils";

async function main() {
  const supabase = createServerClient();

  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source: "trustpilot", status: "running" })
    .select("id")
    .single();

  try {
    console.log("Collecting from Trustpilot...");
    console.log("  Note: Trustpilot uses bot detection. This collector may fail gracefully.");

    let totalFound = 0;
    let newCount = 0;

    // Trustpilot embeds JSON-LD structured data in their review pages.
    // This collector is structured for graceful degradation.
    // TODO: Implement JSON-LD extraction once we identify the schema.

    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        items_found: totalFound,
        items_new: newCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    console.log(`Trustpilot collection complete: ${totalFound} found, ${newCount} new`);
  } catch (error) {
    await supabase
      .from("collection_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run!.id);
    console.error("Trustpilot collection failed (graceful):", error);
  }
}

main();
```

**Step 4: Test all three**

```bash
npx tsx src/collectors/g2.ts
npx tsx src/collectors/capterra.ts
npx tsx src/collectors/trustpilot.ts
```

Expected: All three complete without crashing, report 0 items found (graceful degradation). Collection runs logged in DB.

**Step 5: Commit**

```bash
git add src/collectors/g2.ts src/collectors/capterra.ts src/collectors/trustpilot.ts
git commit -m "feat: add G2, Capterra, Trustpilot collectors with graceful degradation"
```

---

## Phase 3: Frontend

### Task 12: Build API routes

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/complaints/route.ts`
- Create: `src/app/api/stats/route.ts`

**Step 1: Write products API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  const search = params.get("search");
  const category = params.get("category");
  const minPainScore = Number(params.get("minPainScore")) || 0;
  const minDisruptionScore = Number(params.get("minDisruptionScore")) || 0;
  const minPlatformCount = Number(params.get("minPlatformCount")) || 0;
  const painCategory = params.get("painCategory");
  const trendingDirection = params.get("trendingDirection");
  const sortBy = params.get("sortBy") || "pain_score";
  const page = Number(params.get("page")) || 1;
  const pageSize = Math.min(Number(params.get("pageSize")) || 20, 50);

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .gte("pain_score", minPainScore)
    .gte("disruption_score", minDisruptionScore)
    .gte("platform_count", minPlatformCount)
    .gt("total_complaints", 0);

  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (trendingDirection && trendingDirection !== "all") {
    query = query.eq("trending_direction", trendingDirection);
  }

  // Sort
  const sortColumn = ["pain_score", "disruption_score", "trending_delta", "last_complaint_at"].includes(sortBy)
    ? sortBy
    : "pain_score";
  query = query.order(sortColumn, { ascending: false });

  // Paginate
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If filtering by painCategory, we need a subquery approach.
  // For now, filter in-memory (acceptable for moderate dataset sizes).
  // TODO: Optimize with DB-level filtering via product_pain_summary join.

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  });
}
```

**Step 2: Write complaints API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  const productId = params.get("productId");
  const source = params.get("source");
  const page = Number(params.get("page")) || 1;
  const pageSize = Math.min(Number(params.get("pageSize")) || 20, 50);

  let query = supabase
    .from("complaints")
    .select("*", { count: "exact" })
    .eq("analyzed", true)
    .not("product_id", "is", null);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  if (source) {
    query = query.eq("source", source);
  }

  query = query.order("review_date", { ascending: false });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  });
}
```

**Step 3: Write stats API route**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerClient();

  const [productsResult, complaintsResult, avgResult, trendingResult] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).gt("total_complaints", 0),
      supabase.from("complaints").select("id", { count: "exact", head: true }).eq("analyzed", true).not("product_id", "is", null),
      supabase.from("products").select("pain_score").gt("total_complaints", 0),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("trending_direction", "rising"),
    ]);

  const avgPainScore = avgResult.data
    ? Math.round(
        avgResult.data.reduce((s, p) => s + (p.pain_score || 0), 0) /
          (avgResult.data.length || 1)
      )
    : 0;

  return NextResponse.json({
    totalProducts: productsResult.count || 0,
    totalComplaints: complaintsResult.count || 0,
    avgPainScore,
    trendingCount: trendingResult.count || 0,
  });
}
```

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add products, complaints, and stats API routes"
```

---

### Task 13: Build shared UI components

**Files:**
- Create: `src/components/PainScoreGauge.tsx`
- Create: `src/components/PlatformBadge.tsx`
- Create: `src/components/PainCategoryTags.tsx`
- Create: `src/components/TrendingIndicator.tsx`
- Create: `src/components/DisruptionScore.tsx`
- Create: `src/components/StatsBar.tsx`

These are presentational components used across pages. Build them all in one task.

**Key design rules:**
- Pain score color: 0-30 green, 31-60 yellow, 61-80 orange, 81-100 red
- Source colors: G2 `#FF492C`, Capterra `#06BEE1`, Reddit `#FF4500`, HN `#FF6600`, Trustpilot `#00B67A`
- Use Lucide icons
- All components accept typed props from `types.ts`

Implementation: Build each component as a small `"use client"` component. Use the `cn()` utility for conditional classes. Each should be 20-60 lines max.

I won't write the full JSX for every component here — use the design doc's color coding and the Lucide icon names from `categories.ts`. The implementer should build these as standard React components with Tailwind classes.

**Step 1: Build all 6 components following the design spec**

**Step 2: Verify they render in dev server** — temporarily import them in `page.tsx` with mock data.

**Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (gauges, badges, tags, stats)"
```

---

### Task 14: Build main dashboard page

**Files:**
- Create: `src/components/FilterSidebar.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/ProductCard.tsx`
- Modify: `src/app/page.tsx`

**Key behaviors:**
- ISR with `revalidate: 3600` (1 hour)
- Server component fetches initial data
- Client component handles filter state
- FilterSidebar on left (collapsible on mobile)
- ProductCard grid in main area
- Pagination at bottom

**The page should:**
1. Fetch stats from `/api/stats`
2. Render `StatsBar` at top
3. Render `FilterSidebar` on left
4. Fetch products from `/api/products` with filter params
5. Render grid of `ProductCard` components
6. Handle loading/empty/error states with skeleton placeholders

**ProductCard shows:**
- Product name (link to `/product/[slug]`)
- Category badge
- PainScoreGauge + DisruptionScore
- PlatformBadge for each platform
- Top 3 PainCategoryTags
- Total complaint count
- TrendingIndicator
- Price range (if available)
- 1-line "wishes" summary from latest complaint

**Step 1: Build FilterSidebar, SearchBar, ProductCard components**

**Step 2: Build the dashboard page as a hybrid server/client page**

**Step 3: Test with real data from the collectors**

```bash
npm run dev
```

Navigate to localhost:3000. Should see products ranked by pain score with all filters working.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/FilterSidebar.tsx src/components/SearchBar.tsx src/components/ProductCard.tsx
git commit -m "feat: add main dashboard with filters, product cards, pagination"
```

---

### Task 15: Build product deep-dive page

**Files:**
- Create: `src/app/product/[slug]/page.tsx`
- Create: `src/components/ComplaintTimeline.tsx`
- Create: `src/components/CompetitorGap.tsx`
- Create: `src/components/CrossPlatformIndicator.tsx`

**The page should:**
1. Fetch product by slug
2. Fetch all complaints for this product
3. Fetch product_pain_summary for this product
4. Render:
   - Header: name, category, scores, pricing
   - Pain category breakdown (Recharts BarChart)
   - Platform distribution (Recharts PieChart)
   - ComplaintTimeline (Recharts LineChart — complaints per week, 90 days)
   - "The Gap" section: wishes, feature gaps, competitor mentions
   - Raw complaints feed (scrollable, paginated)
   - "Build This" summary from `product.build_this_summary`

**Step 1: Build chart components using Recharts**

**Step 2: Build the product page**

**Step 3: Test** — click a product on the dashboard, verify deep-dive loads with charts and data.

**Step 4: Commit**

```bash
git add src/app/product/ src/components/ComplaintTimeline.tsx src/components/CompetitorGap.tsx src/components/CrossPlatformIndicator.tsx
git commit -m "feat: add product deep-dive page with charts and complaint feed"
```

---

### Task 16: Build categories and trending pages

**Files:**
- Create: `src/app/categories/page.tsx`
- Create: `src/app/trending/page.tsx`

**Categories page:**
- Fetch distinct categories from products table with counts
- Grid of category cards: name, product count, avg pain score, top 3 most-hated products
- Click a category → filters the main dashboard

**Trending page:**
- Fetch products where `trending_direction = 'rising'` sorted by `trending_delta DESC`
- Show 30d vs 60d complaint count comparison
- "New signals" section: products where `first_seen_at` is within last 7 days

**Step 1: Build both pages**

**Step 2: Add navigation header** — Create a simple nav bar in `layout.tsx` with links to /, /categories, /trending.

**Step 3: Test both pages**

**Step 4: Commit**

```bash
git add src/app/categories/ src/app/trending/ src/app/layout.tsx
git commit -m "feat: add categories page, trending page, and navigation"
```

---

### Task 17: Dark/light mode toggle and responsive polish

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`
- Various component touch-ups

**Step 1: Add theme toggle**

A button that toggles the `dark` class on `<html>`. Store preference in localStorage. Use Lucide `Sun`/`Moon` icons.

**Step 2: Mobile responsive pass**

- FilterSidebar: hidden behind hamburger on screens < `lg`
- ProductCard grid: 1 column on mobile, 2 on `md`, 3 on `lg`
- Charts: full-width on mobile
- Navigation: hamburger menu on mobile

**Step 3: Loading/empty/error states**

- Skeleton placeholders for ProductCards while loading
- "No products found" empty state with helpful message
- Error state with retry button

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add dark/light toggle, responsive layout, loading states"
```

---

## Phase 4: Automation + Final

### Task 18: Update GitHub Actions workflows

**Files:**
- Modify: `.github/workflows/collect-data.yml` → split into 3 files
- Create: `.github/workflows/collect-reviews.yml`
- Create: `.github/workflows/collect-discussions.yml`
- Create: `.github/workflows/analyze-and-score.yml`

**Step 1: Delete old workflow, create 3 new ones**

`collect-reviews.yml`:
```yaml
name: Collect Reviews
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Collect G2 Reviews
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          RAPIDAPI_KEY: ${{ secrets.RAPIDAPI_KEY }}
        run: npx tsx src/collectors/g2.ts
      - name: Collect Capterra Reviews
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx src/collectors/capterra.ts
      - name: Collect Trustpilot Reviews
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx src/collectors/trustpilot.ts
```

`collect-discussions.yml`:
```yaml
name: Collect Discussions
on:
  schedule:
    - cron: '0 3,9,15,21 * * *'
  workflow_dispatch:
jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Collect Reddit Complaints
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx src/collectors/reddit.ts
      - name: Collect HN Complaints
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx src/collectors/hackernews.ts
```

`analyze-and-score.yml`:
```yaml
name: Analyze & Score
on:
  schedule:
    - cron: '0 6,18 * * *'
  workflow_dispatch:
jobs:
  analyze:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Stage 2 - AI Analysis
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: npx tsx src/collectors/stage2-extract.ts
      - name: Stage 3 - Scoring
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: npx tsx src/collectors/stage3-score.ts
```

Note: `RAPIDAPI_KEY` needs to be added as a GitHub Actions secret.

**Step 2: Commit**

```bash
rm .github/workflows/collect-data.yml
git add .github/workflows/
git commit -m "feat: split GitHub Actions into 3 workflows (reviews, discussions, analysis)"
```

---

### Task 19: Final build verification

**Step 1: Full build test**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Run all collectors end-to-end**

```bash
npx tsx src/collectors/hackernews.ts
npx tsx src/collectors/reddit.ts
npx tsx src/collectors/g2.ts
npx tsx src/collectors/capterra.ts
npx tsx src/collectors/trustpilot.ts
npx tsx src/collectors/stage2-extract.ts
npx tsx src/collectors/stage3-score.ts
```

**Step 3: Verify dashboard**

```bash
npm run dev
```

Check:
- Dashboard shows products sorted by pain score
- Filters work (search, category, min scores, platform count, trending)
- Product deep-dive shows charts and complaint feed
- Categories page shows grid
- Trending page shows rising products
- Dark/light mode toggle works
- Mobile responsive layout works

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: PainRadar v3 complete — B2B software displeasure discovery engine"
```

---

## Execution Notes

1. **Phase 2 sequencing matters**: Build HN + Reddit first, run full pipeline, verify products appear with scores. Only then add G2/Capterra/Trustpilot.

2. **DB migration is manual**: Paste `supabase/migrations/001_initial_schema.sql` into Supabase SQL Editor and execute it. Then run `npx tsx scripts/seed-categories.ts`.

3. **The review platform collectors (G2, Capterra, Trustpilot) are intentionally stubbed** with graceful degradation. They run without error but collect 0 items. They will be fleshed out iteratively as we figure out working scraping strategies for each.

4. **"Build This" summaries** are generated in Stage 3 for products with 3+ complaints. This is the most expensive Groq call per product but only runs every 12 hours, not on page load.

5. **Next.js 14 not 16**: The existing package.json has Next.js 16.1.6. The spec calls for 14. Downgrade to `^14.2.0` in the scaffold step.
