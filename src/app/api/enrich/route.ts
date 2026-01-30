import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

// Enrich existing opportunities with detailed analysis
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!supabaseUrl || !supabaseKey || !groqKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const groq = new Groq({ apiKey: groqKey })

  // Get opportunities that need enrichment (missing problem/solution fields)
  const { data: opportunities, error: fetchError } = await supabase
    .from('opportunities')
    .select('*')
    .or('problem.is.null,solution.is.null')
    .limit(10) // Process 10 at a time to stay within rate limits

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!opportunities || opportunities.length === 0) {
    return NextResponse.json({ message: 'All opportunities already enriched', enriched: 0 })
  }

  const results = { enriched: 0, errors: 0, processed: opportunities.length }

  for (const opp of opportunities) {
    try {
      const prompt = `Analyze this startup opportunity and provide actionable details.

OPPORTUNITY:
Title: ${opp.title}
Current Summary: ${opp.summary}
Category: ${opp.category?.join(', ')}
Source Quote: ${opp.sources?.[0]?.quote || 'N/A'}
Competitors: ${opp.competitors?.map((c: { name: string }) => c.name).join(', ') || 'N/A'}

Provide a CONCISE analysis (each field should be 1-2 sentences max):

{
  "problem": "What specific problem does this solve? Who experiences it?",
  "solution": "What would this product actually do?",
  "target_audience": "Specific persona (e.g., 'Freelance designers managing 5+ clients')",
  "market_size": "Rough estimate (e.g., '100K-500K potential users')",
  "monetization": "Pricing strategy (e.g., 'Freemium with $19/mo Pro')",
  "mvp_features": ["Core feature 1", "Core feature 2", "Core feature 3"],
  "unique_angle": "What makes this different from existing solutions?"
}

Return ONLY valid JSON. Keep everything brief and actionable.`

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      })

      const text = completion.choices[0]?.message?.content || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])

        const { error: updateError } = await supabase
          .from('opportunities')
          .update({
            problem: analysis.problem,
            solution: analysis.solution,
            target_audience: analysis.target_audience,
            market_size: analysis.market_size,
            monetization: analysis.monetization,
            mvp_features: analysis.mvp_features,
            unique_angle: analysis.unique_angle,
          })
          .eq('id', opp.id)

        if (!updateError) {
          results.enriched++
          console.log(`Enriched: ${opp.title}`)
        } else {
          console.error(`Update error for ${opp.title}:`, updateError.message)
          results.errors++
        }
      }

      // Rate limit pause
      await new Promise(r => setTimeout(r, 2000))

    } catch (e) {
      console.error(`Error enriching ${opp.title}:`, e)
      results.errors++
    }
  }

  return NextResponse.json({
    message: `Enriched ${results.enriched}/${results.processed} opportunities`,
    ...results
  })
}
