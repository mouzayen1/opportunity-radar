# Idea Incubator - Full Project Specification

> A 3-agent system that discovers, validates, builds, and distributes micro-SaaS products autonomously with human checkpoints.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [Core Philosophy](#core-philosophy)
4. [System Architecture](#system-architecture)
5. [OpportunityRadar (Foundation)](#opportunityradar-foundation)
6. [Agent 1: Validator](#agent-1-validator)
7. [Agent 2: Builder](#agent-2-builder)
8. [Agent 3: Distributor](#agent-3-distributor)
9. [Human Checkpoints](#human-checkpoints)
10. [The Full Workflow](#the-full-workflow)
11. [Technical Constraints](#technical-constraints)
12. [Why 3 Agents (Not 6+)](#why-3-agents-not-6)
13. [Future Considerations](#future-considerations)
14. [FAQ](#faq)

---

## Project Overview

The Idea Incubator is a human-in-the-loop AI agent system designed to:

1. **Discover** startup/SaaS opportunities from real user pain points
2. **Validate** ideas through independent research (not just trust initial data)
3. **Improve** ideas by finding unique angles competitors missed
4. **Build** minimal viable products quickly and cheaply
5. **Distribute** products by finding where users actually hang out

The goal is NOT full automation - it's **10x productivity** with human judgment at key decision points.

---

## The Problem We're Solving

### For Aspiring Builders

- "I want to build something but don't know what"
- "I have vague ideas but don't know if they're worth pursuing"
- "I can build things but struggle to get users"

### The Reality of Micro-SaaS

```
Building is 20% of the work
Distribution is 80% of the work

Great product + No distribution = 0 users
Okay product + Great distribution = 1000 users
```

### What Existing Tools Miss

| Tool | What It Does | What It Misses |
|------|--------------|----------------|
| IdeaPicker | Lists ideas | No validation |
| Painpoint | Finds complaints | No improvement suggestions |
| BigIdeasDB | Curates opportunities | No build/distribution help |

**Our Approach:** End-to-end pipeline from discovery to users.

---

## Core Philosophy

### 1. Agents That Think, Not Just Execute

```
BAD AGENT:
  Input: "Build invoice tracker"
  Output: Builds invoice tracker

GOOD AGENT:
  Input: "Build invoice tracker"
  Thinks: "Wait - 50 invoice trackers exist. Why do people still complain?"
  Researches: Finds complaints are about payment FOLLOW-UP, not tracking
  Output: "Don't build invoice tracker. Build payment reminder automation."
```

### 2. Free-Tier Constraints Are Features

Building for free forces:
- Simpler solutions (good)
- Faster launches (good)
- Validation before scaling (good)
- Creativity over budget (good)

### 3. Human-in-the-Loop, Not Human-out-of-Loop

Agents do 90% of the work. Humans make 3 key decisions:
1. Should we build this idea? (after validation)
2. Should we ship this MVP? (after building)
3. Is this getting traction? (after distribution)

### 4. Distribution-First Thinking

Before building, we know:
- Where target users hang out
- What language they use
- What would get their attention
- How we'll reach them

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPPORTUNITY RADAR                          │
│                    (Idea Discovery Engine)                       │
│                                                                 │
│  Sources: HackerNews, GitHub, Dev.to, StackOverflow, ProductHunt│
│  Output: Scored opportunities (Pain + Trend + Gap = Score)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VALIDATOR AGENT                            │
│                                                                 │
│  • Confirms problem exists (independent research)               │
│  • Finds unique angle to win                                    │
│  • Checks free-tier feasibility                                 │
│  • Output: Enhanced Idea Brief + Go/No-Go recommendation        │
└─────────────────────────────────────────────────────────────────┘
                              │
                      [HUMAN CHECKPOINT #1]
                       Approve idea? Go/No-Go
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BUILDER AGENT                             │
│                                                                 │
│  • Plans as it builds (not separately)                          │
│  • Uses free-tier stack (Vercel, Supabase, etc.)                │
│  • Ruthlessly minimal MVP                                       │
│  • Output: Working, deployed product                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                      [HUMAN CHECKPOINT #2]
                        Ship it? Review MVP
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DISTRIBUTOR AGENT                           │
│                                                                 │
│  • Finds where target users actually are                        │
│  • Creates launch content for each channel                      │
│  • Executes launch sequence                                     │
│  • Generates ongoing content calendar                           │
│  • Output: First users + growth playbook                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                      [HUMAN CHECKPOINT #3]
                     Monitor traction & iterate
```

---

## OpportunityRadar (Foundation)

### What It Is

A web app that continuously discovers startup opportunities from online discussions.

**Live at:** https://opportunity-radar-zeta.vercel.app

### The 3-Signal Scoring System

| Signal | What It Measures | Weight |
|--------|------------------|--------|
| Pain Score | How much people struggle (complaints, frustration) | 40% |
| Trend Score | Is interest growing? (Google Trends proxy) | 30% |
| Gap Score | Are existing solutions weak? | 30% |

**Overall Score** = (Pain × 0.4) + (Trend × 0.3) + (Gap × 0.3) × 10

### Data Sources

| Source | What We Extract |
|--------|-----------------|
| Hacker News | "Ask HN" posts with pain keywords |
| GitHub Issues | Popular repos with frustrated users |
| Dev.to | Articles about struggles/alternatives |
| Stack Overflow | High-voted questions about problems |
| Product Hunt | Products solving pain points |

### Tech Stack

- **Frontend:** Next.js + Tailwind + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **AI Analysis:** Google Gemini API (free tier)
- **Hosting:** Vercel (free tier)
- **Automation:** Vercel Cron (daily updates)

### Key Files

```
opportunity-radar/
├── src/app/api/pipeline/route.ts   # Multi-source data collection
├── src/app/api/opportunities/      # API for fetching opportunities
├── src/app/browse/page.tsx         # Browse all opportunities
├── src/app/opportunity/[id]/       # Detailed opportunity view
└── vercel.json                     # Cron job configuration
```

---

## Agent 1: Validator

### Purpose

Don't trust the initial OpportunityRadar data blindly. Independently confirm the opportunity is real and find ways to make it better.

### Three Research Lenses (One Agent)

#### Lens 1: Problem Confirmation
- Search Reddit, Twitter, forums for MORE complaints about this problem
- Quantify: How many people? How often? How painful?
- Find direct quotes from real users
- Determine if this is a vocal minority or widespread pain

#### Lens 2: Strategic Angle
- Analyze ALL existing solutions (not just top 3)
- Find the "why do people still complain despite solutions existing?"
- Identify underserved niches within the problem
- Propose unique angles: combinations, simplifications, or new approaches

#### Lens 3: Economic Feasibility
- Map out free-tier tech stack options
- Calculate true costs (Supabase row limits, Vercel function limits, etc.)
- Identify monetization that works at small scale
- Flag if idea requires paid infrastructure to even test

### Output Format

```markdown
## Validation Report: [Idea Name]

### Problem Confirmed?
- Evidence: [X posts/discussions found]
- Key quote: "[Direct quote from user]"
- Estimated audience size: [Number]
- Verdict: CONFIRMED / WEAK / NOT FOUND

### Existing Solutions Analysis
| Solution | Users | Rating | Key Weakness |
|----------|-------|--------|--------------|
| ...      | ...   | ...    | ...          |

### Enhanced Angle
- Original idea: [What OpportunityRadar suggested]
- Improved idea: [Our better version]
- Why it's better: [Reasoning]
- Target niche: [Specific audience]

### Build Feasibility
- Proposed stack: [Tech choices]
- Free tier limits: [What we get for free]
- Estimated build time: [Rough scope]
- Monthly cost at 1K users: [$X]

### Final Recommendation
[ ] BUILD - Strong opportunity, clear angle
[ ] PIVOT - Problem real, but need different approach
[ ] PASS - Not worth pursuing because [reason]
```

---

## Agent 2: Builder

### Purpose

Build a working MVP as fast as possible with free/cheap tools. This is essentially Claude Code doing what it already does.

### Principles

1. **Plan as you build** - Don't over-plan upfront. Discover scope through iteration.
2. **Ruthlessly minimal** - What's the smallest thing that could validate the idea?
3. **Free-tier first** - Vercel, Supabase, free APIs. Upgrade only when forced.
4. **Ship ugly** - A working ugly product beats a beautiful unreleased one.

### Default Tech Stack

| Layer | Tool | Free Tier Limits |
|-------|------|------------------|
| Frontend | Next.js on Vercel | 100GB bandwidth/mo |
| Database | Supabase | 500MB, 50K rows |
| Auth | Supabase Auth | Unlimited users |
| Email | Resend | 100 emails/day |
| Payments | Stripe | No monthly fee |
| AI | Gemini API | 1500 req/day |
| Analytics | Plausible/Umami | Self-host free |

### Output

- Deployed, working product
- Source code in GitHub
- Basic documentation
- Admin access credentials

---

## Agent 3: Distributor

### Purpose

Get the first 100 users. This is the hardest part that most builders skip.

### Phase 1: Research (Before Launch)

Find where target users actually hang out:

| Channel Type | Examples | How to Find |
|--------------|----------|-------------|
| Subreddits | r/freelance, r/webdev | Search "[problem] reddit" |
| Twitter | Hashtags, key accounts | Search complaints |
| Newsletters | Industry newsletters | Google "[niche] newsletter" |
| Communities | Discord, Slack groups | Search "[niche] community" |
| Podcasts | Niche shows | Search "[topic] podcast" |

Output a **Distribution Map**:
```
| Channel          | Size    | Engagement | Entry Strategy      |
|------------------|---------|------------|---------------------|
| r/freelance      | 850K    | High       | Value post first    |
| @IndieHackers    | 120K    | Medium     | Build in public     |
| Freelance Weekly | 45K     | Very High  | Pitch for feature   |
```

### Phase 2: Content Creation

Create launch content tailored to each channel:

- **Reddit:** Value-first post, personal story, subtle product mention
- **Twitter:** Thread about the problem (not the product)
- **Product Hunt:** Polished listing with GIFs/screenshots
- **Hacker News:** "Show HN" with technical angle

**The Golden Rule:**
```
BAD:  "Check out my new app! [link]"
GOOD: "I was frustrated with [problem] too. Here's what I built
       for myself. Happy to share if anyone wants to try it."
```

### Phase 3: Launch Sequence

```
Day -7:  Start engaging in communities (no promotion)
Day -3:  Tease "working on something" posts
Day  0:  Product Hunt + main channel launch
Day +1:  Respond to EVERY comment within 1 hour
Day +3:  Follow up with early users for feedback
Day +7:  Collect testimonials, iterate based on feedback
Day +14: Write "lessons learned" post (more distribution)
```

### Phase 4: Ongoing Growth

- SEO content targeting "[problem] solution" keywords
- Weekly valuable content in target communities
- Referral program for power users
- Testimonial collection for social proof

### Output

```markdown
## Distribution Report: [Product Name]

### Target Channels (Ranked by Potential)
1. [Channel] - [Size] - [Strategy]
2. ...

### Launch Content (Ready to Post)
- Reddit post: [Full draft]
- Twitter thread: [Full draft]
- Product Hunt listing: [Full draft]

### Week 1 Calendar
| Day | Channel | Action | Content |
|-----|---------|--------|---------|
| ... | ...     | ...    | ...     |

### Ongoing Content Calendar
- Weekly: [Content type] on [Channel]
- Monthly: [Content type] on [Channel]

### Success Metrics
- Week 1 target: [X] signups
- Month 1 target: [X] active users
```

---

## Human Checkpoints

### Checkpoint 1: After Validation

**What you're reviewing:**
- Is the problem real enough?
- Do we like the enhanced angle?
- Are we comfortable with the cost/effort estimate?

**Decisions:**
- **GO:** Proceed to building
- **PIVOT:** Problem is real but angle needs work
- **PASS:** Not worth pursuing

### Checkpoint 2: After Building

**What you're reviewing:**
- Does the MVP work?
- Is it minimal enough (not over-engineered)?
- Are we comfortable putting our name on it?

**Decisions:**
- **SHIP:** Launch publicly
- **ITERATE:** Needs more work before shipping
- **SHELVE:** Built it, learned from it, moving on

### Checkpoint 3: After Distribution

**What you're monitoring:**
- Are people signing up?
- Are they actually using it?
- What feedback are we getting?

**Decisions:**
- **DOUBLE DOWN:** It's working, invest more
- **PIVOT:** Users want something different
- **SUNSET:** Not gaining traction, move to next idea

---

## The Full Workflow

```
Week 1: DISCOVER + VALIDATE
├── OpportunityRadar surfaces top 5 opportunities
├── Validator Agent researches each one
├── Human picks the best validated idea
│
Week 2: BUILD
├── Builder Agent creates MVP
├── Human reviews and requests iterations
├── Final MVP approved for launch
│
Week 3: DISTRIBUTE
├── Distributor Agent researches channels
├── Distributor Agent creates launch content
├── Human approves content
├── Launch sequence executed
│
Week 4+: ITERATE
├── Monitor metrics
├── Collect feedback
├── Decide: grow, pivot, or sunset
```

---

## Technical Constraints

### Must Be Free or Near-Free

| Service | Free Tier | When We Pay |
|---------|-----------|-------------|
| Vercel | 100GB bandwidth | Never for MVP |
| Supabase | 500MB database | 10K+ users |
| Gemini API | 1500 req/day | Never if batched well |
| Domain | ~$12/year | Always (worth it) |
| Resend | 100 emails/day | 1000+ users |

### Build Time Constraint

MVP should be buildable in **one weekend** (1-2 days of focused work).

If it can't be built in a weekend, the scope is too big.

### Complexity Constraint

MVP should have **3 or fewer core features**.

If it needs more, we're not being ruthless enough.

---

## Why 3 Agents (Not 6+)

### Original Design (Over-Engineered)

```
Scout → Strategist → Economist → Architect → Builder → Distribution Scout → Launch Agent → Content Engine
```

**Problems:**
- Context lost at each handoff
- 8 coordination points
- Artificial sequential phases
- More prompts = more cost
- Feels like bureaucracy

### Final Design (Lean)

```
Validator → Builder → Distributor
```

**Benefits:**
- Context preserved within each agent
- Only 2 handoff points
- Natural, interleaved work
- Fewer, richer prompts
- Feels like a 3-person startup

### The Insight

Scout + Strategist + Economist are just **different lenses on the same research**. They naturally interleave - you don't validate, THEN strategize, THEN check costs. You do all three while researching.

Architect + Builder is artificial with Claude Code. Planning and building happen together through iteration.

---

## Future Considerations

### Potential Enhancements

1. **Multiple idea tracks** - Run 3 ideas through validation in parallel, pick the winner
2. **Automated A/B testing** - Distributor tests different messages/channels
3. **Revenue tracking** - Connect Stripe to track actual money made
4. **Portfolio view** - Dashboard of all products built, their status, revenue

### Scaling Considerations

If this works well:
- Could become a product itself ("AI Product Studio")
- Could run multiple build cycles per month
- Could add more specialized agents for specific verticals

### What We're NOT Building

- Fully autonomous (always human checkpoints)
- Get-rich-quick scheme (still requires good judgment)
- Replacement for creativity (agents enhance, not replace)

---

## FAQ

### Q: How is this different from just using ChatGPT/Claude?

**A:** Structure and specialization. Raw LLMs can do anything but nothing well without guidance. Our agents have:
- Specific jobs with clear outputs
- Research methodologies baked in
- Quality standards for each phase
- Handoff protocols between phases

### Q: What if the Validator says "pass" on everything?

**A:** Good! That means it's doing its job. Most ideas shouldn't be built. If it passes on everything, either:
- OpportunityRadar needs better sources
- Validation criteria are too strict
- We need to look at different categories

### Q: How do I know when an MVP is "minimal enough"?

**A:** Ask: "What's the ONE thing this needs to do to validate the idea?"

Build only that. Everything else is scope creep.

### Q: What if I don't like the Distributor's content?

**A:** Edit it! The agent creates drafts, you own the final voice. The value is in:
- Research (finding where users are)
- Structure (launch sequence)
- First drafts (faster than blank page)

### Q: Can I skip agents?

**A:** Yes, but consider:
- Skip Validator → Risk building something nobody wants
- Skip Builder → Nothing to distribute
- Skip Distributor → Product exists, nobody knows about it

### Q: What's the expected success rate?

**A:** Honestly? Low. Most products fail. But this system:
- Fails faster (validate before building)
- Fails cheaper (free tier everything)
- Learns more (structured process captures lessons)

### Q: How much does this cost to run?

**A:** Near zero for MVPs:
- OpportunityRadar: $0 (Vercel + Supabase free tiers)
- Gemini API: $0 (1500 requests/day free)
- Domains: ~$12/year each
- Your time: The main cost

### Q: Can I use this for non-SaaS products?

**A:** The framework works for any digital product:
- Browser extensions
- Mobile apps
- Info products
- Templates/tools

Just adjust the Builder agent's tech stack.

---

## Quick Reference

### The One-Liner

> "OpportunityRadar finds ideas. Validator confirms them. Builder ships them. Distributor gets users. Humans decide at each step."

### The Workflow

```
Radar → Validator → [HUMAN] → Builder → [HUMAN] → Distributor → [HUMAN]
```

### The Philosophy

1. Agents think critically, not just execute
2. Free-tier constraints force creativity
3. Distribution > Building
4. Human judgment at key decisions
5. Ship fast, learn fast

---

## Current Status

- [x] OpportunityRadar built and deployed
- [x] Multi-source data pipeline (5 sources)
- [x] Switched to Groq (Llama 3.3 70B) - 14,400 req/day free tier
- [x] **QUALITY OVERHAUL** (Jan 30, 2026)
  - Pre-filtering: Coding question detection via regex
  - Business pain keyword requirements
  - AI: Critical prompt with 7 rejection criteria
  - 82-88% rejection rate (only ~15% of inputs accepted)
  - Sources: Removed framework repos, added indie hacker search
  - Duplicate detection: URL + title similarity (60% threshold)
- [ ] Reddit source (blocked from serverless - needs workaround)
- [ ] Validator Agent implementation
- [ ] Builder Agent workflow
- [ ] Distributor Agent implementation

---

*Document created: January 2026*
*Last updated: January 2026*
*Project: Idea Incubator / OpportunityRadar*
