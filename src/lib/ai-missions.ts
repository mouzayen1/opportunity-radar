/**
 * AI Mining Missions v4.0
 *
 * 12 AI missions that use Groq/Gemini via pi-ai to extract
 * software opportunities from training knowledge.
 * Runs in 3 batches of 4 to avoid rate limiting.
 */

import { getModel, complete, Context, getEnvApiKey } from '@mariozechner/pi-ai'
import type { RawOpportunity, AIMission, LogEntry } from '@/types'

// ---------------------------------------------------------------------------
// Provider rotation (mirrors pipeline/route.ts)
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', envKey: 'groq' },
  { provider: 'google', model: 'gemini-2.0-flash', envKey: 'google' },
] as const

type ProviderConfig = typeof PROVIDERS[number]

function getAvailableProviders(): ProviderConfig[] {
  return PROVIDERS.filter(p => {
    const key = getEnvApiKey(p.envKey)
    return key !== undefined
  })
}

// ---------------------------------------------------------------------------
// System prompt (used for every mission)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a JSON API endpoint. You have deep knowledge of recurring software complaints, unmet needs, pricing frustrations, manual workflows, feature requests, and niche industry software gaps from millions of online discussions.

ABSOLUTE RULES:
1. Respond with ONLY a valid JSON array. Nothing else.
2. First character must be [, last must be ]
3. NEVER include markdown, backticks, explanatory text, or apologies
4. Every item must reflect REAL patterns with real tool names and real communities
5. Non-compliance will crash the system`

// ---------------------------------------------------------------------------
// Shared JSON schema fragment (keeps prompts DRY)
// ---------------------------------------------------------------------------

const JSON_SHAPE = `Each object in the array MUST have these fields:
{
  "title": "short descriptive title (3-8 words)",
  "problem": "1-2 sentence description of the pain point",
  "source": "ai_mission",
  "type": "greenfield" or "makeItBetter",
  "engagement": "high", "medium", or "low",
  "recency": number of estimated days since this was commonly discussed (1-180),
  "url": null,
  "existingTool": "name of current tool people use or null",
  "workaround": "what people do today instead",
  "frequency": "how often users hit this problem (daily/weekly/monthly)",
  "willingness_to_pay": "explicit price signal if any, or null",
  "competitors": ["list", "of", "known", "competitors"],
  "industry": "industry vertical or null",
  "targetUser": "who has this problem",
  "buildComplexity": "easy", "medium", or "hard"
}`

// ---------------------------------------------------------------------------
// 12 Mission definitions
// ---------------------------------------------------------------------------

export const MISSIONS: AIMission[] = [
  {
    id: 1,
    name: 'Missing Tools',
    description: 'Greenfield "wish there was" patterns where no good tool exists',
    prompt: `Return a JSON array of 8-10 software opportunities where people frequently say "I wish there was a tool for..." or "Why is there no good...". Focus on GREENFIELD gaps where NO adequate solution exists today.

For each item also include:
- "topComplaints": ["top 3 complaints people voice about the lack of this tool"]
- "subreddit": "the subreddit or HN thread where this is most commonly seen"

${JSON_SHAPE}

Focus on REAL recurring patterns from Reddit (r/SaaS, r/smallbusiness, r/webdev, r/startups, r/Entrepreneur), Hacker News, and Indie Hackers. Every tool name and community must be real.`,
  },
  {
    id: 2,
    name: 'Hated Tools',
    description: 'High-engagement complaints about specific widely-used tools',
    prompt: `Return a JSON array of 8-10 software tools that are WIDELY HATED by their users but still dominant because alternatives are worse. These are "makeItBetter" opportunities.

For each item also include:
- "topComplaints": ["the top 3 specific complaints users have"]
- "subreddit": "where these complaints are most commonly voiced"
- "existingTool": "the specific hated tool name"
- "points": estimated typical upvote count on complaint posts

${JSON_SHAPE}

Focus on tools with 10,000+ users where complaints consistently get high engagement. Use REAL tool names (e.g. Jira, Salesforce, QuickBooks). Every entry must reference real tools and real communities.`,
  },
  {
    id: 3,
    name: 'Overpriced SaaS',
    description: 'Pricing complaints with specific dollar amounts',
    prompt: `Return a JSON array of 8-10 SaaS products where users frequently complain about pricing with SPECIFIC dollar amounts. These are opportunities to build cheaper alternatives.

For each item also include:
- "currentPrice": "what users report paying (e.g. '$99/mo', '$1200/yr')",
- "desiredPrice": "what users say they'd willingly pay",
- "subreddit": "where pricing complaints appear most",
- "existingTool": "the overpriced tool name"

${JSON_SHAPE}

Every price mentioned must reflect REAL pricing complaints from Reddit, HN, or G2 reviews. Include real tool names like Intercom, Notion Teams, HubSpot, Figma, etc.`,
  },
  {
    id: 4,
    name: 'Switching Signals',
    description: 'Migration patterns - "leaving X because" signals',
    prompt: `Return a JSON array of 8-10 tools/platforms where there is an active migration wave - users are leaving in significant numbers. These represent "makeItBetter" opportunities.

For each item also include:
- "triggerEvent": "what specific event or change triggered the migration (e.g. pricing change, acquisition, feature removal)",
- "migrationTarget": "where users are migrating TO, or 'nothing good yet' if no clear alternative",
- "existingTool": "the tool people are leaving",
- "subreddit": "where migration discussions are happening"

${JSON_SHAPE}

Focus on REAL migration waves with identifiable trigger events. Reference real product changes, acquisitions, or policy updates that caused user exodus.`,
  },
  {
    id: 5,
    name: 'Manual Workflow Gaps',
    description: 'Tasks people do manually that should be automated',
    prompt: `Return a JSON array of 8-10 manual workflows that professionals repeatedly describe doing by hand, where automation would save significant time and money.

For each item also include:
- "frequency": "how often this manual task is performed (daily/weekly/monthly)",
- "timeWasted": "estimated time spent per occurrence",
- "subreddit": "where this pain is most discussed",
- "willingness_to_pay": "what people say they'd pay to automate this"

${JSON_SHAPE}

Focus on workflows involving spreadsheets, copy-paste between tools, manual data entry, or repetitive click-sequences. Every workflow must be one real people describe in online forums.`,
  },
  {
    id: 6,
    name: 'Niche Industry Software Gaps',
    description: 'Underserved verticals - veterinary, property mgmt, bookkeeping, etc.',
    prompt: `Return a JSON array of 8-10 niche industry verticals where professionals complain that existing software is outdated, overpriced, or missing key features specific to their industry.

For each item also include:
- "industry": "specific niche (e.g. 'veterinary clinics', 'property management', 'funeral homes', 'auto repair shops')",
- "existingTool": "the dominant but hated tool in this niche",
- "subreddit": "the industry-specific subreddit or forum",
- "topComplaints": ["top 3 industry-specific complaints"]

${JSON_SHAPE}

Focus on industries with $10K+/year software spend where incumbents are legacy/desktop software or overpriced enterprise solutions. Every industry and tool name must be real.`,
  },
  {
    id: 7,
    name: 'Developer Tooling Frustrations',
    description: 'DX pain points developers repeatedly complain about',
    prompt: `Return a JSON array of 8-10 developer experience (DX) frustrations that come up repeatedly in developer communities. These are tools or workflows where the existing solution is painful.

For each item also include:
- "existingTool": "the specific tool or workflow that frustrates developers",
- "subreddit": "r/webdev, r/programming, HN, or specific community",
- "topComplaints": ["top 3 DX complaints"],
- "aiCapability": "how AI/LLMs could improve this if applicable, or null"

${JSON_SHAPE}

Focus on REAL DX pain from r/webdev, r/programming, r/devops, r/node, Hacker News. Include specific tool names (Docker, Webpack, AWS Console, Terraform, etc). Every complaint must reflect real community sentiment.`,
  },
  {
    id: 8,
    name: 'AI-Adjacent Opportunities',
    description: 'Problems that LLMs make newly solvable but nobody has built yet',
    prompt: `Return a JSON array of 8-10 problems that are NOW solvable thanks to LLMs/AI but where nobody has built a good dedicated product yet. These are greenfield AI-native opportunities.

For each item also include:
- "aiCapability": "the specific AI capability that enables this (e.g. 'document understanding', 'code generation', 'classification')",
- "moat": "what would make this defensible beyond just an API wrapper",
- "subreddit": "where this need is discussed",
- "topComplaints": ["why existing AI tools don't solve this well enough"]

${JSON_SHAPE}

Focus on opportunities that go BEYOND simple ChatGPT wrappers. Each must leverage a specific AI capability in a way that requires domain expertise, data pipelines, or UX innovation to execute well. Every opportunity must reflect real unmet needs.`,
  },
  {
    id: 9,
    name: 'Enshittification Casualties',
    description: 'Products that recently degraded - ads, price hikes, feature removal',
    prompt: `Return a JSON array of 8-10 products/platforms that have recently undergone "enshittification" - degrading their user experience through ads, price hikes, feature removal, anti-consumer changes, or quality decline.

For each item also include:
- "existingTool": "the specific product that degraded",
- "triggerEvent": "what specific change caused the backlash",
- "subreddit": "where the complaints are concentrated",
- "topComplaints": ["top 3 specific complaints about the degradation"],
- "points": estimated typical upvote count on complaint posts

${JSON_SHAPE}

Focus on REAL recent product degradations that generated significant online backlash. Every product name, change event, and community must be real and verifiable.`,
  },
  {
    id: 10,
    name: 'Integration/Glue Gaps',
    description: 'Two popular tools that should connect but do not',
    prompt: `Return a JSON array of 8-10 integration gaps where two popular tools SHOULD work together seamlessly but don't, forcing users to use Zapier, manual export/import, or custom scripts.

For each item also include:
- "existingTool": "Tool A + Tool B (e.g. 'Stripe + QuickBooks')",
- "workaround": "what users currently do to bridge the gap",
- "subreddit": "where integration complaints appear",
- "willingness_to_pay": "what users say they'd pay for native integration"

${JSON_SHAPE}

Focus on integration gaps between tools each with 100K+ users. Every tool pairing must reflect real integration complaints from online communities. Include the specific data flow that is broken.`,
  },
  {
    id: 11,
    name: 'Support Forum Mining',
    description: 'Features that companies refuse to build despite years of requests',
    prompt: `Return a JSON array of 8-10 feature requests that have been sitting in product forums, GitHub issues, or support communities for YEARS with high votes but the company refuses to build them.

For each item also include:
- "existingTool": "the tool whose users are requesting this feature",
- "subreddit": "where the frustration is voiced (could be the product's own forum)",
- "topComplaints": ["top 3 quotes from frustrated users"],
- "willingness_to_pay": "what users say they'd pay for a standalone solution"

${JSON_SHAPE}

Focus on REAL long-standing feature requests with 100+ votes on product forums. Every tool name and feature request must be real. Include specific feature descriptions, not vague wishes.`,
  },
  {
    id: 12,
    name: '"Shut Up and Take My Money"',
    description: 'Explicit willingness-to-pay signals in online discussions',
    prompt: `Return a JSON array of 8-10 software needs where people have EXPLICITLY stated willingness to pay, using phrases like "shut up and take my money", "I'd pay $X for this", "someone please build this, I'll be your first customer".

For each item also include:
- "statedPrice": "the explicit price users mentioned (e.g. '$20/mo', '$50/mo')",
- "willingness_to_pay": "direct quote of pay signal",
- "subreddit": "where this was expressed",
- "topComplaints": ["what specifically they want that doesn't exist"]

${JSON_SHAPE}

Every entry must reflect REAL pay signals from real online discussions. Include the specific price points people mentioned. Focus on signals from r/SaaS, r/smallbusiness, r/startups, r/Entrepreneur, Hacker News, and Indie Hackers.`,
  },
]

// ---------------------------------------------------------------------------
// Helper: create a LogEntry
// ---------------------------------------------------------------------------

function log(
  level: LogEntry['level'],
  source: string,
  message: string
): LogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    source,
    message,
  }
}

// ---------------------------------------------------------------------------
// Helper: call AI provider and parse JSON array
// ---------------------------------------------------------------------------

async function callAI(
  prompt: string,
  provider: ProviderConfig,
  missionName: string,
  logs: LogEntry[]
): Promise<RawOpportunity[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = getModel(provider.provider as any, provider.model as any)
  const context: Context = {
    messages: [
      { role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`, timestamp: Date.now() },
    ],
  }

  const response = await complete(model, context, {
    temperature: 0.7,
    maxTokens: 4000,
  })

  // Extract text
  let text = ''
  for (const content of response.content) {
    if (content.type === 'text') {
      text += content.text
    }
  }

  // Strip markdown fences if the model ignores the system prompt
  text = text.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  // Find the JSON array
  const arrStart = text.indexOf('[')
  const arrEnd = text.lastIndexOf(']')
  if (arrStart === -1 || arrEnd === -1) {
    logs.push(log('warning', missionName, `No JSON array found in response (${text.length} chars)`))
    return []
  }

  const jsonStr = text.slice(arrStart, arrEnd + 1)

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      logs.push(log('warning', missionName, 'Parsed JSON is not an array'))
      return []
    }
    return parsed as RawOpportunity[]
  } catch (e) {
    logs.push(log('warning', missionName, `JSON parse error: ${e instanceof Error ? e.message : String(e)}`))
    return []
  }
}

// ---------------------------------------------------------------------------
// Run a single mission
// ---------------------------------------------------------------------------

export async function runMission(missionId: number): Promise<RawOpportunity[]> {
  const mission = MISSIONS.find(m => m.id === missionId)
  if (!mission) throw new Error(`Mission ${missionId} not found`)

  const providers = getAvailableProviders()
  if (providers.length === 0) {
    throw new Error('No AI providers available. Set GROQ_API_KEY or GEMINI_API_KEY.')
  }

  const provider = providers[(missionId - 1) % providers.length]
  const logs: LogEntry[] = []

  const results = await callAI(mission.prompt, provider, mission.name, logs)

  // Enrich results with mission metadata
  return results.map((r, i) => ({
    ...r,
    id: `mission-${missionId}-${i}-${Date.now()}`,
    source: 'ai_mission' as const,
    missionId: mission.id,
    url: r.url || null,
    type: r.type === 'greenfield' || r.type === 'makeItBetter' ? r.type : 'greenfield',
    engagement: r.engagement === 'high' || r.engagement === 'medium' || r.engagement === 'low' ? r.engagement : 'medium',
    recency: typeof r.recency === 'number' ? r.recency : 30,
    sourceCount: 1,
  }))
}

// ---------------------------------------------------------------------------
// Run all 12 missions in 3 batches of 4
// ---------------------------------------------------------------------------

export async function runAllMissions(): Promise<{
  results: RawOpportunity[]
  logs: LogEntry[]
}> {
  const logs: LogEntry[] = []
  const allResults: RawOpportunity[] = []

  const providers = getAvailableProviders()
  if (providers.length === 0) {
    logs.push(log('error', 'AI Missions', 'No AI providers available. Set GROQ_API_KEY or GEMINI_API_KEY.'))
    return { results: [], logs }
  }

  logs.push(log('info', 'AI Missions', `Starting 12 missions across ${providers.length} provider(s): ${providers.map(p => p.provider).join(', ')}`))

  // Split missions into 3 batches of 4
  const batches: AIMission[][] = [
    MISSIONS.slice(0, 4),
    MISSIONS.slice(4, 8),
    MISSIONS.slice(8, 12),
  ]

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    logs.push(log('info', 'AI Missions', `Batch ${batchIdx + 1}/3: Running missions ${batch.map(m => m.id).join(', ')} (${batch.map(m => m.name).join(', ')})`))

    // Run all 4 missions in the batch concurrently
    const batchPromises = batch.map(async (mission, indexInBatch) => {
      // Rotate providers within the batch
      const provider = providers[(batchIdx * 4 + indexInBatch) % providers.length]
      const missionLog: LogEntry[] = []

      logs.push(log('info', `Mission ${mission.id}`, `Starting "${mission.name}" via ${provider.provider}`))
      const startTime = Date.now()

      try {
        const rawResults = await callAI(mission.prompt, provider, `Mission ${mission.id}: ${mission.name}`, missionLog)

        // Enrich with mission metadata and ensure field validity
        const enriched = rawResults.map((r, i) => ({
          ...r,
          id: `mission-${mission.id}-${i}-${Date.now()}`,
          source: 'ai_mission' as const,
          missionId: mission.id,
          url: r.url || null,
          type: (r.type === 'greenfield' || r.type === 'makeItBetter' ? r.type : 'greenfield') as 'greenfield' | 'makeItBetter',
          engagement: (r.engagement === 'high' || r.engagement === 'medium' || r.engagement === 'low' ? r.engagement : 'medium') as 'high' | 'medium' | 'low',
          recency: typeof r.recency === 'number' ? r.recency : 30,
          sourceCount: 1,
        }))

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        logs.push(log('success', `Mission ${mission.id}`, `"${mission.name}" returned ${enriched.length} opportunities in ${elapsed}s`))
        logs.push(...missionLog)

        return enriched
      } catch (e) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        const msg = e instanceof Error ? e.message : String(e)
        logs.push(log('error', `Mission ${mission.id}`, `"${mission.name}" failed after ${elapsed}s: ${msg}`))
        logs.push(...missionLog)

        // If rate-limited, add a specific warning
        if (msg.includes('429') || msg.includes('rate')) {
          logs.push(log('warning', `Mission ${mission.id}`, 'Rate limited - results from other missions will still be used'))
        }

        return [] as RawOpportunity[]
      }
    })

    const batchResults = await Promise.all(batchPromises)
    for (const results of batchResults) {
      allResults.push(...results)
    }

    logs.push(log('info', 'AI Missions', `Batch ${batchIdx + 1}/3 complete. Total opportunities so far: ${allResults.length}`))

    // Pause between batches to avoid rate limiting (except after the last batch)
    if (batchIdx < batches.length - 1) {
      logs.push(log('info', 'AI Missions', 'Pausing 3s between batches to avoid rate limits...'))
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  logs.push(log('success', 'AI Missions', `All 12 missions complete. Total raw opportunities: ${allResults.length}`))

  return { results: allResults, logs }
}
