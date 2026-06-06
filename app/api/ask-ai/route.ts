import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an expert personal training and coaching assistant built into the Revive Training Group coaching platform. You help coaches with:
- Programming workouts and training plans
- Nutrition advice and meal planning for clients
- Client motivation and communication strategies
- Exercise technique and form cues
- Recovery and injury prevention
- Goal setting and progress tracking
- Check-in feedback and coaching responses

Keep responses concise and practical. Use bullet points when listing multiple items. You're talking to a personal trainer, so use appropriate fitness terminology.`,
      messages,
    })
  })

  const data = await response.json()
  const reply = data.content?.[0]?.text ?? 'Sorry, I could not get a response.'
  return NextResponse.json({ reply })
}
