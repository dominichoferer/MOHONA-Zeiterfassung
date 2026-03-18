'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company, Project, Profile } from '@/lib/types'
import { DURATION_OPTIONS } from '@/lib/config'
import { todayISO, formatDuration } from '@/lib/utils'
import { X, Sparkles, Upload, FileText, Trash2, CheckCircle2, ChevronDown, Loader2, Mic, Square } from 'lucide-react'
import CompanySelect from './CompanySelect'
import * as XLSX from 'xlsx'

interface BulkEntry {
  _id: string
  description: string
  notes: string
  company_id: string
  project_id: string
  duration_minutes: number
  date: string
}

interface BulkEntryModalProps {
  profile: Profile
  onClose: () => void
  onSaved: () => void
}

const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-3 py-2 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light bg-white"

export default function BulkEntryModal({ profile, onClose, onSaved }: BulkEntryModalProps) {
  const [tab, setTab] = useState<'text' | 'file' | 'voice'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<BulkEntry[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Voice state
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'companies')),
      getDocs(collection(db, 'projects')),
    ]).then(([c, p]) => {
      setCompanies(c.docs.map(d => ({ id: d.id, ...d.data() } as Company)).filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name)))
      setProjects(p.docs.map(d => ({ id: d.id, ...d.data() } as Project)).filter(p => p.is_active).sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    setSpeechSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  // Stop recording on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = true

    let finalSoFar = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalSoFar += chunk + ' '
        } else {
          interim += chunk
        }
      }
      setTranscript(finalSoFar)
      setInterimText(interim)
    }

    recognition.onend = () => {
      setRecording(false)
      setInterimText('')
      // Sync final transcript from closure
      setTranscript(finalSoFar)
    }

    recognition.onerror = () => {
      setRecording(false)
      setInterimText('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
    setInterimText('')
  }

  function resetVoice() {
    recognitionRef.current?.stop()
    setRecording(false)
    setTranscript('')
    setInterimText('')
  }

  async function handleAnalyze() {
    setError('')
    setAnalyzing(true)
    try {
      let body: Record<string, unknown> = {
        companies: companies.map(c => ({ id: c.id, name: c.name })),
        projects: projects.map(p => ({ id: p.id, name: p.name, company_id: p.company_id })),
        today: todayISO(),
      }

      if (tab === 'voice') {
        body.text = transcript.trim()
      } else if (tab === 'file' && file) {
        const isExcel = file.name.match(/\.(xlsx?|ods)$/i)
        if (isExcel) {
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(buf)
          const rows: string[] = []
          wb.SheetNames.forEach(name => {
            const ws = wb.Sheets[name]
            const csv = XLSX.utils.sheet_to_csv(ws)
            rows.push(csv)
          })
          body.text = rows.join('\n')
        } else {
          const base64 = await fileToBase64(file)
          body.file = { base64, mimeType: file.type || 'application/octet-stream', name: file.name }
        }
      } else {
        body.text = text
      }

      const res = await fetch('/api/ki-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Fehler')

      setEntries(data.entries.map((e: Omit<BulkEntry, '_id'>, i: number) => ({ ...e, _id: `${Date.now()}-${i}` })))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!entries?.length) return
    setSaving(true)
    try {
      await Promise.all(entries.map(e =>
        addDoc(collection(db, 'time_entries'), {
          user_id: profile.user_id,
          staff_code: profile.staff_code,
          company_id: e.company_id || null,
          project_id: e.project_id || null,
          description: e.description,
          notes: e.notes || null,
          duration_minutes: e.duration_minutes,
          date: e.date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      ))
      onSaved()
    } catch {
      setError('Speichern fehlgeschlagen')
      setSaving(false)
    }
  }

  function updateEntry(id: string, patch: Partial<BulkEntry>) {
    setEntries(prev => prev?.map(e => e._id === id ? { ...e, ...patch } : e) ?? null)
  }

  function removeEntry(id: string) {
    setEntries(prev => {
      const next = prev?.filter(e => e._id !== id) ?? null
      return next?.length ? next : null
    })
  }

  function onDrop(ev: React.DragEvent) {
    ev.preventDefault()
    const f = ev.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const canAnalyze =
    tab === 'text' ? text.trim().length > 3 :
    tab === 'voice' ? transcript.trim().length > 3 :
    !!file

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-[#e5dfd5]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dfd5] bg-[#faf8f5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2c2316] rounded-lg flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif' }}>KI-Bulk Eingabe</h2>
              <p className="text-xs text-[#8a7f72] font-light">Mehrere Einträge auf einmal erfassen</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#b5a99a] hover:text-[#1e1813] rounded-lg hover:bg-[#f0ebe3]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!entries ? (
            /* INPUT STEP */
            <div className="p-6 space-y-4">
              {/* Tab toggle */}
              <div className="flex bg-[#f5f0ea] rounded-lg p-0.5 w-fit">
                {(['text', 'voice', 'file'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); if (t !== 'voice') stopRecording() }}
                    className={`px-4 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${tab === t ? 'bg-white text-[#1e1813] shadow-sm font-medium' : 'text-[#8a7f72] font-light'}`}>
                    {t === 'voice' && <Mic size={11} />}
                    {t === 'text' ? 'Text eingeben' : t === 'voice' ? 'Sprache' : 'Datei hochladen'}
                  </button>
                ))}
              </div>

              {tab === 'text' && (
                <div>
                  <label className="block text-xs text-[#8a7f72] mb-2 uppercase tracking-wide">Tätigkeiten — eine pro Zeile</label>
                  <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
                    placeholder={`z.B.:\nFuxiConnect Logo Redesign 2h gestern\nMohona Newsletter erstellen 1.5h\nROB Website Meeting 45min heute\nSEO-Analyse für Kunde ABC 3h 2026-03-15`}
                    className="w-full border border-[#e5dfd5] rounded-xl px-4 py-3 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light resize-none placeholder-[#b5a99a] bg-white" />
                  <p className="text-xs text-[#b5a99a] mt-1.5 font-light">Firma, Projekt, Dauer und Datum werden automatisch erkannt</p>
                </div>
              )}

              {tab === 'voice' && (
                <div className="space-y-4">
                  {!speechSupported ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                      Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.
                    </div>
                  ) : (
                    <>
                      {/* Mic button area */}
                      <div className="flex flex-col items-center gap-4 py-6">
                        <button
                          onClick={recording ? stopRecording : startRecording}
                          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                            recording
                              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200'
                              : 'bg-[#2c2316] hover:bg-[#3d3220] shadow-lg shadow-[#2c2316]/20'
                          }`}
                        >
                          {recording && (
                            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                          )}
                          {recording
                            ? <Square size={26} className="text-white fill-white" />
                            : <Mic size={26} className="text-white" />
                          }
                        </button>
                        <p className="text-sm text-[#8a7f72] font-light">
                          {recording ? 'Aufnahme läuft — tippe zum Stoppen' : transcript ? 'Aufnahme gestoppt' : 'Tippen zum Starten'}
                        </p>
                        {recording && (
                          <div className="flex gap-1 items-end h-5">
                            {[2, 4, 3, 5, 2, 4, 3, 2, 5, 3].map((h, i) => (
                              <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse"
                                style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Live transcript */}
                      {(transcript || interimText) && (
                        <div className="border border-[#e5dfd5] rounded-xl px-4 py-3 bg-[#faf8f5] min-h-[80px] text-sm font-light leading-relaxed">
                          <span className="text-[#1e1813]">{transcript}</span>
                          {interimText && <span className="text-[#b5a99a] italic">{interimText}</span>}
                        </div>
                      )}

                      {transcript && !recording && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#8a7f72] font-light">
                            {transcript.trim().split(/\s+/).length} Wörter erkannt
                          </p>
                          <button onClick={resetVoice} className="text-xs text-[#b5a99a] hover:text-red-500 underline font-light">
                            Neu aufnehmen
                          </button>
                        </div>
                      )}

                      {!transcript && !recording && (
                        <p className="text-xs text-[#b5a99a] text-center font-light">
                          Erzähl einfach, was du heute gemacht hast — die KI erkennt Firma, Projekt und Dauer automatisch
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === 'file' && (
                <div ref={dropRef} onDragOver={e => e.preventDefault()} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[#e5dfd5] rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#2c2316] hover:bg-[#faf8f5] transition-colors">
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.ods" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
                  {file ? (
                    <>
                      <FileText size={32} className="text-[#2c2316] mb-3" />
                      <p className="text-sm font-medium text-[#1e1813]">{file.name}</p>
                      <p className="text-xs text-[#8a7f72] mt-1 font-light">{(file.size / 1024).toFixed(0)} KB</p>
                      <button onClick={e => { e.stopPropagation(); setFile(null) }} className="mt-3 text-xs text-[#b5a99a] hover:text-red-500">Entfernen</button>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-[#b5a99a] mb-3" />
                      <p className="text-sm font-medium text-[#1e1813]">PDF, Bild oder Excel hochladen</p>
                      <p className="text-xs text-[#8a7f72] mt-1 font-light">Klicken oder Datei hierher ziehen</p>
                      <p className="text-xs text-[#b5a99a] mt-1 font-light">.pdf · .png · .jpg · .xlsx · .xls</p>
                    </>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={handleAnalyze} disabled={!canAnalyze || analyzing || recording}
                className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {analyzing ? 'KI analysiert...' : 'Mit KI analysieren'}
              </button>
            </div>
          ) : (
            /* REVIEW STEP */
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#8a7f72] font-light">{entries.length} Einträge erkannt — bitte prüfen und anpassen</p>
                <button onClick={() => { setEntries(null); setError('') }} className="text-xs text-[#8a7f72] hover:text-[#1e1813] underline font-light">Zurück</button>
              </div>

              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <EntryRow key={entry._id} entry={entry} idx={idx} companies={companies} projects={projects}
                    onChange={patch => updateEntry(entry._id, patch)}
                    onRemove={() => removeEntry(entry._id)} />
                ))}
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {entries && (
          <div className="px-6 py-4 border-t border-[#e5dfd5] bg-[#faf8f5] flex items-center justify-between">
            <span className="text-xs text-[#8a7f72] font-light">{entries.length} Einträge · {formatDuration(entries.reduce((s, e) => s + e.duration_minutes, 0))} gesamt</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-[#8a7f72] border border-[#e5dfd5] rounded-lg font-light">Abbrechen</button>
              <button onClick={handleSave} disabled={saving || entries.length === 0}
                className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Speichern...' : `${entries.length} Einträge speichern`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EntryRow({ entry, idx, companies, projects, onChange, onRemove }: {
  entry: BulkEntry; idx: number; companies: Company[]; projects: Project[]
  onChange: (patch: Partial<BulkEntry>) => void; onRemove: () => void
}) {
  const filteredProjects = projects.filter(p => !entry.company_id || p.company_id === entry.company_id)

  return (
    <div className="bg-white border border-[#e5dfd5] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#b5a99a] font-light">Eintrag {idx + 1}</span>
        <button onClick={onRemove} className="p-1 text-[#b5a99a] hover:text-red-500 rounded"><Trash2 size={13} /></button>
      </div>

      {/* Row 1: date + duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Datum</label>
          <input type="date" value={entry.date} onChange={e => onChange({ date: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Dauer</label>
          <div className="relative">
            <select value={entry.duration_minutes} onChange={e => onChange({ duration_minutes: Number(e.target.value) })}
              className={inputClass + ' appearance-none pr-8 cursor-pointer'}>
              {DURATION_OPTIONS.map(o => <option key={o.minutes} value={o.minutes}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: company + project */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Firma</label>
          <CompanySelect companies={companies} value={entry.company_id} onChange={id => onChange({ company_id: id, project_id: '' })} placeholder="Firma wählen..." />
        </div>
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Projekt</label>
          <CompanySelect
            companies={filteredProjects.map(p => ({ ...p, color: '#e5dfd5', text_color: '#1e1813' }))}
            value={entry.project_id} onChange={id => onChange({ project_id: id })} placeholder="Projekt wählen..." />
        </div>
      </div>

      {/* Row 3: description + notes */}
      <div>
        <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Headline</label>
        <input type="text" value={entry.description} onChange={e => onChange({ description: e.target.value })}
          placeholder="Kurze Headline..." className={inputClass} maxLength={60} />
      </div>
      <div>
        <label className="block text-xs text-[#8a7f72] mb-1 uppercase tracking-wide">Beschreibung <span className="normal-case text-[#b5a99a]">(optional)</span></label>
        <textarea value={entry.notes} onChange={e => onChange({ notes: e.target.value })} rows={2}
          placeholder="Ausführlichere Beschreibung..." className={inputClass + ' resize-none'} />
      </div>
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
