/**
 * Gemini AI Analyzer
 *
 * Uses Google Gemini to analyze pain points and score opportunities.
 * Generates summaries, categories, and validates quality.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

interface RawPainPoint {
  source: string
  title: string
  text: string
  url: string
  author: string
  score: number
  date: string
}

interface AnalyzedOpportunity {
  title: string
  summary: string
  pain_score: number
  trend_score: number
  gap_score: number
  overall_score: number
  category: string[]
  keywords: string[]
  sources: Array<{
    platform: string
    url: string
    quote: string
    author: string
  }>
  competitors: Array<{
    name: string
    rating: number
    weakness: string
  }>
  isValid: boolean
  reason?: string
}

const ANALYSIS_PROMPT = `You are an expert startup opportunity analyst. Analyze the following pain point and determine if it represents a valid business opportunity.

Pain Point:
Title: {title}
Source: {source}
Text: {text}
Engagement Score: {score}

Your task:
1. Determine if this is a REAL pain point that could be solved with a product/service
2. If valid, create a structured opportunity analysis

Respond with JSON in this exact format:
{
  "isValid": true/false,
  "reason": "Why this is/isn't valid (if invalid)",
  "title": "Clean, concise opportunity title (if valid)",
  "summary": "2-3 sentence summary of the problem and opportunity (if valid)",
  "pain_score": 1-10 (how severe is the pain?),
  "gap_score": 1-10 (estimated - how poorly served is this need?),
  "category": ["category1", "category2"] (from: saas, developer-tools, productivity, finance, health, education, e-commerce, ai-ml, consumer, b2b, mobile, other),
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "competitors": [
    {"name": "Competitor Name", "rating": 3.5, "weakness": "Main weakness"}
  ],
  "quote": "Most relevant quote from the text that shows the pain"
}

Rules:
- Be skeptical - not every complaint is a business opportunity
- Reject vague complaints, personal rants, or one-off issues
- Valid opportunities have: clear problem, potential market, solvable with software
- Pain score: 8-10 = severe, daily impact; 5-7 = moderate annoyance; 1-4 = mild inconvenience
- Gap score: 8-10 = no good solutions; 5-7 = solutions exist but flawed; 1-4 = good solutions exist
- Categories should reflect the problem domain
- Keywords should be searchable terms related to the problem`

export async function analyzeWithGemini(
  painPoints: RawPainPoint[],
  apiKey: string
): Promise<AnalyzedOpportunity[]> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const opportunities: AnalyzedOpportunity[] = []

  console.log(`Analyzing ${painPoints.length} pain points with Gemini...`)

  for (const point of painPoints) {
    try {
      const prompt = ANALYSIS_PROMPT
        .replace('{title}', point.title)
        .replace('{source}', point.source)
        .replace('{text}', point.text.slice(0, 1000))
        .replace('{score}', String(point.score))

      const result = await model.generateContent(prompt)
      const response = result.response.text()

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.log(`Failed to parse response for: ${point.title}`)
        continue
      }

      const analysis = JSON.parse(jsonMatch[0])

      if (!analysis.isValid) {
        console.log(`Rejected: ${point.title} - ${analysis.reason}`)
        continue
      }

      // Calculate overall score
      const overall_score = Math.round(
        (analysis.pain_score * 0.4 + analysis.gap_score * 0.3 + 5 * 0.3) * 10
      )

      opportunities.push({
        title: analysis.title,
        summary: analysis.summary,
        pain_score: analysis.pain_score,
        trend_score: 5, // Will be updated by trend analysis
        gap_score: analysis.gap_score,
        overall_score,
        category: analysis.category,
        keywords: analysis.keywords,
        sources: [{
          platform: point.source,
          url: point.url,
          quote: analysis.quote || point.text.slice(0, 200),
          author: point.author,
        }],
        competitors: analysis.competitors || [],
        isValid: true,
      })

      console.log(`Analyzed: ${analysis.title} (Score: ${overall_score})`)

      // Rate limiting - Gemini free tier has limits
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`Error analyzing ${point.title}:`, error)
    }
  }

  console.log(`Successfully analyzed ${opportunities.length} opportunities`)
  return opportunities
}

// Run if called directly
if (require.main === module) {
  const testPoint: RawPainPoint = {
    source: 'hackernews',
    title: 'Ask HN: Why is invoice tracking still so painful for freelancers?',
    text: 'I spend hours every month chasing payments and tracking which invoices are paid. Every tool I try is either too complex or missing basic features like automatic reminders.',
    url: 'https://news.ycombinator.com/item?id=12345',
    author: 'testuser',
    score: 150,
    date: new Date().toISOString(),
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set')
    process.exit(1)
  }

  analyzeWithGemini([testPoint], apiKey).then(opportunities => {
    console.log('\n--- Results ---')
    console.log(JSON.stringify(opportunities, null, 2))
  })
}
