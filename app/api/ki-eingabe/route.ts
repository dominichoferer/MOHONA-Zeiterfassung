import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API Key fehlt' }, { status: 500 })
  }

  const body = await req.json()
  const input: string = body.input ?? ''
  const companies: { id: string; name: string }[] = body.companies ?? []

  if (input.trim().length < 3) {
    return NextResponse.json({ error: 'Eingabe zu kurz (min. 3 Zeichen)' }, { status: 400 })
  }

  const companyList = companies.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')

  const systemPrompt = `Du bist ein Assistent, der Zeiterfassungseinträge aus natürlicher Sprache extrahiert.

Verfügbare Firmen/Kunden:
${companyList || '(keine Firmen angegeben)'}

Extrahiere aus dem Input folgende Felder:
- description: Kurze, prägnante Headline der Tätigkeit (auf Deutsch, max. 60 Zeichen, keine Zeitangabe)
- notes: Ausführlichere Beschreibung der Tätigkeit (auf Deutsch, 1-2 Sätze, was genau gemacht wurde). Falls keine Details bekannt, formuliere sinnvoll auf Basis der Headline.
- company_id: Die UUID der passenden Firma oder null wenn unklar
- duration_minutes: Dauer in Minuten (Zahl)
- confidence: Wie sicher du dir bist (0 bis 1)

Antworte NUR mit einem JSON-Objekt, kein Markdown, keine Erklärung.
Beispiel: {"description":"Newsletter erstellt","notes":"Monatlichen Newsletter für den Kundenstamm verfasst und layoutet.","company_id":"abc-123","duration_minutes":60,"confidence":0.9}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: input }],
      system: systemPrompt,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    const validCompanyIds = companies.map(c => c.id)
    if (result.company_id && !validCompanyIds.includes(result.company_id)) {
      result.company_id = null
    }

    return NextResponse.json({
      description: result.description ?? '',
      notes: result.notes ?? '',
      company_id: result.company_id ?? null,
      duration_minutes: Number(result.duration_minutes) || 60,
      confidence: Number(result.confidence) || 0.5,
    })
  } catch (err) {
    console.error('KI-Eingabe Fehler:', err)
    return NextResponse.json({ error: 'KI-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
