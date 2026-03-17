import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API Key fehlt' }, { status: 500 })
  }

  const body = await req.json()
  const text: string = body.text ?? ''
  const file: { base64: string; mimeType: string; name: string } | null = body.file ?? null
  const companies: { id: string; name: string }[] = body.companies ?? []
  const projects: { id: string; name: string; company_id: string }[] = body.projects ?? []
  const today: string = body.today ?? new Date().toISOString().split('T')[0]

  const companyList = companies.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')
  const projectList = projects.map(p => {
    const comp = companies.find(c => c.id === p.company_id)
    return `- ${p.name} (ID: ${p.id}, Firma: ${comp?.name ?? p.company_id})`
  }).join('\n')

  const systemPrompt = `Du bist ein Assistent für Zeiterfassung. Heute ist ${today}.

Verfügbare Firmen:
${companyList || '(keine)'}

Verfügbare Projekte:
${projectList || '(keine)'}

Extrahiere aus dem Input ALLE Tätigkeiten/Aufgaben als Array. Jede Zeile / jeder Absatz ist typischerweise ein eigener Eintrag.

Für jeden Eintrag extrahiere:
- description: Kurze prägnante Headline (Deutsch, max. 60 Zeichen)
- notes: Kurze Beschreibung was gemacht wurde (Deutsch, 1-2 Sätze). Falls keine Details, formuliere sinnvoll.
- company_id: UUID der passenden Firma oder null
- project_id: UUID des passenden Projekts oder null
- duration_minutes: Dauer in Minuten (falls nicht angegeben: 60)
- date: Datum im Format YYYY-MM-DD (falls nicht angegeben: ${today}, "gestern" = ${(() => { const d = new Date(today); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0] })()})

Antworte NUR mit einem JSON-Array, kein Markdown, keine Erklärung.
Beispiel: [{"description":"Newsletter erstellt","notes":"Newsletter für Kundenstamm verfasst.","company_id":"abc","project_id":"xyz","duration_minutes":60,"date":"${today}"}]`

  try {
    let messageContent: Anthropic.MessageParam['content']

    if (file) {
      const isImage = file.mimeType.startsWith('image/')
      const isPdf = file.mimeType === 'application/pdf'

      if (isImage) {
        messageContent = [
          {
            type: 'image',
            source: { type: 'base64', media_type: file.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: file.base64 },
          },
          { type: 'text', text: 'Extrahiere alle Zeiterfassungseinträge aus diesem Bild/Dokument.' },
        ]
      } else if (isPdf) {
        messageContent = [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
          } as Anthropic.DocumentBlockParam,
          { type: 'text', text: 'Extrahiere alle Zeiterfassungseinträge aus diesem Dokument.' },
        ]
      } else {
        // Excel or other text-based file — content was pre-parsed client-side and sent as text
        messageContent = text || 'Keine Daten gefunden.'
      }
    } else {
      messageContent = text
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden' }, { status: 500 })
    }

    const validCompanyIds = companies.map(c => c.id)
    const validProjectIds = projects.map(p => p.id)

    const entries = JSON.parse(jsonMatch[0]).map((e: Record<string, unknown>) => ({
      description: String(e.description ?? ''),
      notes: String(e.notes ?? ''),
      company_id: validCompanyIds.includes(String(e.company_id)) ? String(e.company_id) : null,
      project_id: validProjectIds.includes(String(e.project_id)) ? String(e.project_id) : null,
      duration_minutes: Number(e.duration_minutes) || 60,
      date: String(e.date ?? today),
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    console.error('KI-Bulk Fehler:', err)
    return NextResponse.json({ error: 'KI-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
