import Groq from 'groq-sdk';
import { FilteredItem, OpportunityAnalysis, ComplaintType, Complexity } from './types';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const ANALYSIS_PROMPT = `You are analyzing a post to identify software business opportunities.

POST TYPE: {opportunity_type}
TITLE: {title}
CONTENT: {content}

Analyze this {type_description} and extract:

1. **Summary**: 1-2 sentence summary of the opportunity
2. {type_specific_field}
3. **Target Market**: Who would pay for a solution? (e.g., "SMB owners", "developers", "content creators")
4. **Complexity**: How hard to build? Options: weekend, month, quarter, major
5. **Scores** (0-100):
   - Pain Score: How painful is this problem?
   - Market Score: How big is the potential market?
   - Feasibility Score: How feasible is this to build as an indie/small team?
   - Urgency Score: How urgent is the need?
{complaint_type_instruction}

Respond in JSON format:
{
  "summary": "string",
  {type_specific_json}
  "target_market": "string",
  "complexity": "weekend|month|quarter|major",
  "pain_score": number,
  "market_score": number,
  "feasibility_score": number,
  "urgency_score": number{complaint_type_json}
}

Only output valid JSON, no markdown code blocks.`;

function buildPrompt(item: FilteredItem): string {
  const isGreenfield = item.opportunity_type === 'GREENFIELD';

  const typeDescription = isGreenfield
    ? 'post about something that doesn\'t exist yet or a problem without a good solution'
    : 'post complaining about an existing tool/service';

  const typeSpecificField = isGreenfield
    ? '**Problem Description**: What problem needs solving?'
    : '**Existing Solution**: What existing tool/service are they complaining about?';

  const typeSpecificJson = isGreenfield
    ? '"problem_description": "string",'
    : '"existing_solution": "string",';

  const complaintTypeInstruction = isGreenfield
    ? ''
    : `6. **Complaint Type**: What's the main complaint? Options: pricing, missing_feature, complexity, performance, support, reliability, other`;

  const complaintTypeJson = isGreenfield
    ? ''
    : ',\n  "complaint_type": "pricing|missing_feature|complexity|performance|support|reliability|other"';

  return ANALYSIS_PROMPT
    .replace('{opportunity_type}', item.opportunity_type)
    .replace('{title}', item.title)
    .replace('{content}', item.raw_text.slice(0, 2000)) // Limit content length
    .replace('{type_description}', typeDescription)
    .replace('{type_specific_field}', typeSpecificField)
    .replace('{type_specific_json}', typeSpecificJson)
    .replace('{complaint_type_instruction}', complaintTypeInstruction)
    .replace('{complaint_type_json}', complaintTypeJson);
}

function parseAnalysisResponse(response: string, opportunityType: string): OpportunityAnalysis | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.summary || !parsed.target_market || !parsed.complexity) {
      console.error('Missing required fields in analysis response');
      return null;
    }

    // Validate complexity
    const validComplexities: Complexity[] = ['weekend', 'month', 'quarter', 'major'];
    if (!validComplexities.includes(parsed.complexity)) {
      parsed.complexity = 'month'; // Default
    }

    // Validate complaint type for MAKE_IT_BETTER
    if (opportunityType === 'MAKE_IT_BETTER' && parsed.complaint_type) {
      const validComplaintTypes: ComplaintType[] = [
        'pricing', 'missing_feature', 'complexity', 'performance', 'support', 'reliability', 'other'
      ];
      if (!validComplaintTypes.includes(parsed.complaint_type)) {
        parsed.complaint_type = 'other';
      }
    }

    // Clamp scores to 0-100
    const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

    return {
      summary: parsed.summary,
      problem_description: parsed.problem_description,
      existing_solution: parsed.existing_solution,
      complaint_type: parsed.complaint_type,
      target_market: parsed.target_market,
      complexity: parsed.complexity,
      pain_score: clampScore(parsed.pain_score ?? 50),
      market_score: clampScore(parsed.market_score ?? 50),
      feasibility_score: clampScore(parsed.feasibility_score ?? 50),
      urgency_score: clampScore(parsed.urgency_score ?? 50),
    };
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    console.error('Raw response:', response);
    return null;
  }
}

export async function analyzeOpportunity(item: FilteredItem): Promise<OpportunityAnalysis | null> {
  const client = getGroqClient();
  const prompt = buildPrompt(item);

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.error('Empty response from Groq');
      return null;
    }

    return parseAnalysisResponse(response, item.opportunity_type);
  } catch (error: unknown) {
    // Re-throw rate limit errors for handling upstream
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      throw error;
    }
    console.error('Groq API error:', error);
    return null;
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
