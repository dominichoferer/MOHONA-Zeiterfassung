'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TimeEntry, Company, Project } from '@/lib/types'
import { DURATION_OPTIONS } from '@/lib/config'
import { X, ChevronDown } from 'lucide-react'

interface EditEntryModalProps {
  entry: TimeEntry
  onClose: () => void
  onSaved: (updated: TimeEntry) => void
}

const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-4 py-3 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light"

export default function EditEntryModal({ entry, onClose, onSaved }: EditEntryModalProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [description, setDescription] = useState(entry.description)
  const [companyId, setCompanyId] = useState(entry.company_id ?? '')
  const [projectId, setProjectId] = useState(entry.project_id ?? '')
  const [durationMinutes, setDurationMinutes] = useState(entry.duration_minutes)
  const [date, setDate] = useState(entry.date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'companies')).then(snap => {
      setCompanies(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => {
    if (!companyId) { setProjects([]); return }
    getDocs(query(collection(db, 'projects'), where('company_id', '==', companyId))).then(snap => {
      setProjects(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Project))
        .filter(p => p.is_active)
        .sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [companyId])

  async function handleSave() {
    if (!description || !companyId) return
    setSaving(true)
    setError('')
    try {
      const updates = { description, company_id: companyId, project_id: projectId || null, duration_minutes: durationMinutes, date, updated_at: new Date().toISOString() }
      await updateDoc(doc(db, 'time_entries', entry.id), updates)
      const companyData = companies.find(c => c.id === companyId)
      const projectData = projects.find(p => p.id === projectId)
      onSaved({ ...entry, ...updates, company: companyData, project: projectData })
    } catch (err) {
      setError('Fehler beim Speichern: ' + (err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#e5dfd5]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dfd5]">
          <h2 className="text-xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>Eintrag bearbeiten</h2>
          <button onClick={onClose} className="text-[#b5a99a] hover:text-[#1e1813]"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Beschreibung</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma / Kunde</label>
            <div className="flex flex-wrap gap-2">
              {companies.map(c => (
                <button key={c.id} onClick={() => { setCompanyId(c.id); setProjectId('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    companyId === c.id ? 'border-transparent shadow-sm' : 'border-[#e5dfd5] text-[#8a7f72]'
                  }`}
                  style={companyId === c.id ? { backgroundColor: c.color, color: c.text_color } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Projekt</label>
              <div className="relative">
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  disabled={!companyId || projects.length === 0}
                  className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 pr-9 text-sm text-[#1e1813] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2316] disabled:bg-[#faf8f5] disabled:text-[#b5a99a] font-light">
                  <option value="">Kein Projekt</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Datum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Dauer</label>
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

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e5dfd5]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8a7f72] border border-[#e5dfd5] rounded-lg hover:border-[#b5a99a] font-light">Abbrechen</button>
          <button onClick={handleSave} disabled={!description || !companyId || saving}
            className="px-4 py-2 text-sm font-medium bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white rounded-lg">
            {saving ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
