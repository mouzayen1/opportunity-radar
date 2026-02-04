# OpportunityRadar v2

Find software business opportunities from community discussions across Hacker News, Reddit, and GitHub.

## Features

- **Two Opportunity Types**:
  - **GREENFIELD**: Problems without existing solutions
  - **MAKE IT BETTER**: Existing tools that need improvement

- **2-Stage Filtering**:
  - Stage 1: Pattern matching, recency, engagement
  - Stage 2: AI analysis with Groq (Llama 3.3 70B)

- **Sources**:
  - Hacker News (Algolia API)
  - Reddit (7 relevant subreddits)
  - GitHub (25+ curated popular repos)

- **Scoring**:
  - Pain, Market, Feasibility, Urgency scores
  - Recency score based on post age
  - Replacement score for MAKE_IT_BETTER opportunities
  - Overall weighted score

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
GITHUB_TOKEN=your-github-pat
```

### 2. Database Setup

Run the schema in your Supabase SQL Editor:

```bash
# See supabase-schema.sql
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Run Data Collection

```bash
npm run collect
```

## GitHub Actions

Data collection runs automatically every 6 hours via GitHub Actions.

Add these secrets to your repository:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GH_PAT` (GitHub Personal Access Token)

## Project Structure

```
opportunity-radar/
├── .github/workflows/collect-data.yml
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/opportunities/  # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             # React components
│   ├── lib/                    # Core utilities
│   │   ├── types.ts
│   │   ├── supabase.ts
│   │   ├── scoring.ts
│   │   └── groq.ts
│   └── collectors/             # Data collectors
│       ├── stage1-filter.ts
│       ├── stage2-analyze.ts
│       ├── hackernews.ts
│       ├── reddit.ts
│       ├── github.ts
│       └── run-collection.ts
├── supabase-schema.sql
└── package.json
```

## License

MIT
