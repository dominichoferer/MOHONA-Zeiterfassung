'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company, Project, Profile } from '@/lib/types'
import { DURATION_OPTIONS } from '@/lib/config'
import { todayISO, formatDuration, getClosestDuration } from '@/lib/utils'
import { Sparkles, PenLine, CheckCircle2, ChevronDown } from 'lucide-react'

interface TimeEntryFormProps {
  profile: Profile
}

const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-4 py-3 text-sm text-[#1e1813] placeholder-[#b5a99a] focus:outline-none focus:ring-2 focus:ring-[#2c2316] focus:border-transparent font-light"

export default function TimeEntryForm({ profile }: TimeEntryFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [description, setDescription] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [date, setDate] = useState(todayISO())

  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiDone, setAiDone] = useState(false)

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch all companies, filter active client-side (avoids composite index)
    getDocs(collection(db, 'companies')).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
      setCompanies(list)
    })
  }, [])

  useEffect(() => {
    if (!companyId) { setProjects([]); setProjectId(''); return }
    // Fetch projects by company only, filter active client-side (avoids composite index)
    getDocs(query(collection(db, 'projects'), where('company_id', '==', companyId))).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Project))
        .filter(p => p.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
      setProjects(list)
      setProjectId('')
    })
  }, [companyId])

  async function handleAiProcess() {
    if (aiInput.trim().length < 3) return
    setAiLoading(true)
    setAiDone(false)
    setError('')
    try {
      const res = await fetch('/api/ki-eingabe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: aiInput, companies: companies.map(c => ({ id: c.id, name: c.name })) }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDescription(data.description)
      if (data.company_id) setCompanyId(data.company_id)
      setDurationMinutes(getClosestDuration(data.duration_minutes).minutes)
      setAiConfidence(data.confidence)
      setAiDone(true)
    } catch {
      setError('KI-Verarbeitung fehlgeschlagen')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit() {
    if (!description || !companyId || !durationMinutes || !date) return
    setSaving(true)
    setError('')
    try {
      await addDoc(collection(db, 'time_entries'), {
        user_id: profile.user_id,
        staff_code: profile.staff_code,
        company_id: companyId,
        project_id: projectId || null,
        description,
        duration_minutes: durationMinutes,
        date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setSuccess(true)
      setTimeout(() => router.push('/eintraege'), 1500)
    } catch (err) {
      setError('Fehler beim Speichern: ' + (err as Error).message)
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-[#e5dfd5] p-12 flex flex-col items-center justify-center text-center">
        <CheckCircle2 size={40} className="text-[#16a34a] mb-4" />
        <h3 className="text-2xl text-[#1e1813] mb-1" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>Gespeichert.</h3>
        <p className="text-sm text-[#8a7f72] font-light">Weiterleitung zu deinen Einträgen...</p>
      </div>
    )
  }

  const canSave = description.trim() && companyId && durationMinutes > 0

  return (
    <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
      <div className="flex border-b border-[#e5dfd5]">
        {([
          { key: 'ai', label: 'KI-Schnelleingabe', icon: Sparkles },
          { key: 'manual', label: 'Manuell', icon: PenLine },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setMode(key)}
            className={`flex items-center gap-2 px-6 py-4 text-sm border-b-2 transition-colors ${
              mode === key ? 'border-[#2c2316] text-[#2c2316] font-medium' : 'border-transparent text-[#8a7f72] hover:text-[#1e1813] font-light'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {mode === 'ai' && (
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Beschreibe was du gemacht hast</label>
            <div className="flex gap-2">
              <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiProcess()}
                placeholder='z.B. "Newsletter für Kunde A, 2 Stunden"' className={inputClass} />
              <button onClick={handleAiProcess} disabled={aiInput.trim().length < 3 || aiLoading}
                className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap">
                <Sparkles size={14} />{aiLoading ? 'Analysiere...' : 'Analysieren'}
              </button>
            </div>
            {aiConfidence !== null && aiDone && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 bg-[#f5f0ea] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${aiConfidence * 100}%`, backgroundColor: aiConfidence > 0.7 ? '#16a34a' : aiConfidence > 0.4 ? '#d97706' : '#dc2626' }} />
                </div>
                <span className="text-xs text-[#8a7f72] font-light">{Math.round(aiConfidence * 100)}% Sicherheit</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Beschreibung *</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Was wurde gemacht?" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma / Kunde *</label>
            <div className="flex flex-wrap gap-2">
              {companies.map(c => (
                <button key={c.id} onClick={() => setCompanyId(companyId === c.id ? '' : c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    companyId === c.id ? 'border-transparent shadow-sm' : 'border-[#e5dfd5] text-[#8a7f72] bg-white hover:border-[#b5a99a]'
                  }`}
                  style={companyId === c.id ? { backgroundColor: c.color, color: c.text_color } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">
              Projekt <span className="text-[#b5a99a]">(optional)</span>
            </label>
            <div className="relative">
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                disabled={!companyId || projects.length === 0}
                className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 pr-9 text-sm text-[#1e1813] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2316] disabled:bg-[#faf8f5] disabled:text-[#b5a99a] font-light">
                <option value="">{!companyId ? 'Erst Firma wählen' : projects.length === 0 ? 'Keine Projekte' : 'Kein Projekt'}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Dauer *</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.minutes} onClick={() => setDurationMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    durationMinutes === opt.minutes ? 'bg-[#2c2316] text-white border-[#2c2316]' : 'border-[#e5dfd5] text-[#8a7f72] hover:border-[#2c2316] hover:text-[#2c2316]'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Datum *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3"><p className="text-xs text-red-600">{error}</p></div>}

        <div className="flex items-center justify-between pt-2 border-t border-[#e5dfd5]">
          <p className="text-xs text-[#b5a99a] font-light">
            {canSave ? `${formatDuration(durationMinutes)} · ${companies.find(c => c.id === companyId)?.name ?? ''}` : 'Pflichtfelder ausfüllen'}
          </p>
          <button onClick={handleSubmit} disabled={!canSave || saving}
            className="bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg text-sm">
            {saving ? 'Speichern...' : 'Eintrag speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
