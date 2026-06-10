import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { client, checkins, stats, logs } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ analysis: 'Error: ANTHROPIC_API_KEY not set.' })

  // Build context from client data
  const recentCheckins = checkins.slice(0, 5)
  const latestWeight = stats[0]?.weight_lbs
  const earliestWeight = stats[stats.length - 1]?.weight_lbs
  const weightChange = latestWeight && earliestWeight ? (latestWeight - earliestWeight).toFixed(1) : null
  const recentLogs = logs.slice(0, 10)

  const checkinSummary = recentCheckins.map((c: any) => `
- Date: ${c.submitted_at?.split('T')[0]}
  Energy: ${c.energy_level}/10, Sleep: ${c.sleep_quality}/10, Stress: ${c.stress_level}/10
  Nutrition adherence: ${c.nutrition_adherence}/10, Workout adherence: ${c.workout_adherence}/10
  Wins: ${c.wins || 'none'}, Struggles: ${c.struggles || 'none'}
  Questions: ${c.questions || 'none'}`).join('\n')

  const weightSummary = latestWeight
    ? `Current weight: ${latestWeight} lbs${weightChange ? `, total change: ${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange} lbs over ${stats.length} entries` : ''}`
    : 'No weight data logged'

  const workoutSummary = recentLogs.length > 0
    ? `${recentLogs.length} recent workouts logged. Last workout: ${recentLogs[0]?.workout?.title ?? 'Unknown'} on ${recentLogs[0]?.logged_at?.split('T')[0]}`
    : 'No workouts logged yet'

  const prompt = `You are an expert fitness coaching assistant. Analyze this client's recent performance data and give a structured assessment.

CLIENT: ${client.profile?.full_name ?? 'Client'}
Goal: ${client.goal || 'Not specified'}

WEIGHT:
${weightSummary}

RECENT CHECK-INS (last ${recentCheckins.length}):
${checkinSummary || 'No check-ins yet'}

WORKOUT HISTORY:
${workoutSummary}

Return your analysis in exactly this format with no extra text, no markdown, no asterisks:

OVERALL TREND
[one sentence on whether they are improving, declining, or maintaining]

STRENGTHS
- [strength 1]
- [strength 2]

CONCERNS
- [concern 1]
- [concern 2]

RECOMMENDATION
- [one specific actionable thing the coach should do or tell this client]

Be direct, specific, and use actual numbers from the data.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ analysis: `Error: ${data.error?.message}` })
    return NextResponse.json({ analysis: data.content?.[0]?.text ?? 'No analysis generated.' })
  } catch (err: any) {
    return NextResponse.json({ analysis: `Request failed: ${err.message}` })
  }
}
