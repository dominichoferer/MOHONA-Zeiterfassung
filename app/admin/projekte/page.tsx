'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminGuard from '@/components/AdminGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company, Project, Profile } from '@/lib/types'
import { Plus, Pencil, X, Check, Search, CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDuration, formatDateShort } from '@/lib/utils'
import CompanySelect from '@/components/CompanySelect'
import DateNavigator from '@/components/DateNavigator'
import CompanyBadge from '@/components/CompanyBadge'

const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-4 py-2.5 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light"

export default function ProjektePage() {
  return (
    <AuthGuard>
      {(profile) => (
        <div className="min-h-screen bg-[#faf8f5]">
          <Navbar profile={profile} />
          <main className="pt-14 p-8">
            <AdminGuard profile={profile}><ProjekteContent profile={profile} /></AdminGuard>
          </main>
        </div>
      )}
    </AuthGuard>
  )
}

function ProjekteContent({ profile }: { profile: Profile }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterName, setFilterName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', company_id: '', planned_hours: '' })
  const [saving, setSaving] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [allEntries, setAllEntries] = useState<{project_id: string; duration_minutes: number; date: string}[]>([])
  const [dateFrom, setDateFrom] = useState('2000-01-01')
  const [dateTo, setDateTo] = useState('2099-12-31')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  void profile

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'companies')),
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'time_entries')),
    ]).then(([c, p, t]) => {
      const compList = c.docs.map(d => ({ id: d.id, ...d.data() } as Company)).filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name))
      const compMap = new Map(compList.map(c => [c.id, c]))
      setCompanies(compList)
      setProjects(p.docs.map(d => {
        const data = d.data()
        return { id: d.id, ...data, company: compMap.get(data.company_id) } as Project
      }))
      setAllEntries(t.docs.map(d => {
        const data = d.data()
        return { project_id: data.project_id ?? '', duration_minutes: data.duration_minutes ?? 0, date: data.date ?? '' }
      }).filter(e => e.project_id))
      setLoading(false)
    })
  }, [])

  const usedMinutes = new Map<string, number>()
  allEntries.filter(e => e.date >= dateFrom && e.date <= dateTo).forEach(e => {
    usedMinutes.set(e.project_id, (usedMinutes.get(e.project_id) ?? 0) + e.duration_minutes)
  })

  const filtered = projects
    .filter(p => !filterCompany || p.company_id === filterCompany)
    .filter(p => !filterName || p.name.toLowerCase().includes(filterName.toLowerCase()))

  const activeProjects = filtered.filter(p => !p.is_completed)
  const completedProjects = filtered.filter(p => p.is_completed)

  async function handleAdd() {
    if (!form.name.trim() || !form.company_id) return
    setSaving(true)
    const ph = form.planned_hours ? Number(form.planned_hours) : null
    const ref = await addDoc(collection(db, 'projects'), { name: form.name.trim(), company_id: form.company_id, planned_hours: ph, is_active: true, created_at: new Date().toISOString() })
    const company = companies.find(c => c.id === form.company_id)
    setProjects(prev => [...prev, { id: ref.id, name: form.name.trim(), company_id: form.company_id, planned_hours: ph, is_active: true, created_at: new Date().toISOString(), company }].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', company_id: '', planned_hours: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    const ph = form.planned_hours ? Number(form.planned_hours) : null
    await updateDoc(doc(db, 'projects', id), { name: form.name, company_id: form.company_id, planned_hours: ph })
    const company = companies.find(c => c.id === form.company_id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: form.name, company_id: form.company_id, planned_hours: ph, company } : p))
    setEditId(null)
    setSaving(false)
  }

  async function toggleActive(project: Project) {
    await updateDoc(doc(db, 'projects', project.id), { is_active: !project.is_active })
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_active: !p.is_active } : p))
  }

  async function toggleCompleted(project: Project) {
    await updateDoc(doc(db, 'projects', project.id), { is_completed: !project.is_completed })
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_completed: !p.is_completed } : p))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8 pt-4">
        <div>
          <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>
            Projekte
          </h1>
          <p className="text-sm text-[#8a7f72] mt-1 font-light">Verwalte Projekte je Firma.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', company_id: '', planned_hours: '' }) }}
          className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] text-white text-sm font-medium px-4 py-2.5 rounded-lg">
          <Plus size={15} />Neues Projekt
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e5dfd5] p-4 mb-4 flex items-center gap-3 flex-wrap">
        <DateNavigator initialMode="all" onChange={(from, to) => { setDateFrom(from); setDateTo(to) }} />
        <div className="w-52">
          <CompanySelect companies={companies} value={filterCompany} onChange={setFilterCompany} placeholder="Alle Firmen" />
        </div>
        <div className="flex items-center gap-2 border border-[#e5dfd5] rounded-lg px-3 py-2.5 bg-white flex-1 max-w-xs">
          <Search size={13} className="text-[#b5a99a] shrink-0" />
          <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)}
            placeholder="Projekt suchen..." className="flex-1 text-sm text-[#1e1813] focus:outline-none font-light bg-transparent placeholder-[#b5a99a]" />
          {filterName && <button onClick={() => setFilterName('')}><X size={12} className="text-[#b5a99a] hover:text-[#1e1813]" /></button>}
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border-2 border-[#2c2316] p-5 mb-4">
          <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Dazzle Unicase, sans-serif' }}>Neues Projekt anlegen</h3>
          <ProjectForm form={form} setForm={setForm} companies={companies} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#b5a99a] font-light">Keine Projekte gefunden</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dfd5] bg-[#faf8f5]">
                {['', 'Projekt', 'Firma', 'Stunden', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f0ea]">
              {activeProjects.map(project => (
                <ProjectRow key={project.id} project={project} usedMinutes={usedMinutes} editId={editId} form={form} setForm={setForm} companies={companies} saving={saving}
                  onEdit={() => { setForm({ name: project.name, company_id: project.company_id, planned_hours: project.planned_hours?.toString() ?? '' }); setEditId(project.id); setShowAdd(false) }}
                  onUpdate={() => handleUpdate(project.id)} onCancelEdit={() => setEditId(null)}
                  onToggleActive={() => toggleActive(project)} onToggleCompleted={() => toggleCompleted(project)}
                  onViewEntries={() => setSelectedProject(project)} />
              ))}
              {completedProjects.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-2 bg-[#faf8f5]">
                    <button onClick={() => setShowCompleted(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-[#8a7f72] hover:text-[#1e1813] font-light transition-colors">
                      {showCompleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      Abgeschlossene anzeigen ({completedProjects.length})
                    </button>
                  </td>
                </tr>
              )}
              {showCompleted && completedProjects.map(project => (
                <ProjectRow key={project.id} project={project} usedMinutes={usedMinutes} editId={editId} form={form} setForm={setForm} companies={companies} saving={saving}
                  onEdit={() => { setForm({ name: project.name, company_id: project.company_id, planned_hours: project.planned_hours?.toString() ?? '' }); setEditId(project.id); setShowAdd(false) }}
                  onUpdate={() => handleUpdate(project.id)} onCancelEdit={() => setEditId(null)}
                  onToggleActive={() => toggleActive(project)} onToggleCompleted={() => toggleCompleted(project)}
                  onViewEntries={() => setSelectedProject(project)} completed />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedProject && (
        <ProjectEntriesModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  )
}

function ProjectEntriesModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [entries, setEntries] = useState<{ id: string; date: string; description: string; notes: string | null; duration_minutes: number; staff_code: string; staff_name?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'time_entries'), where('project_id', '==', project.id))),
      getDocs(collection(db, 'profiles')),
    ]).then(([snap, profSnap]) => {
      const profMap = new Map(profSnap.docs.map(d => [d.id, (d.data() as { staff_name: string }).staff_name]))
      const result = snap.docs.map(d => {
        const data = d.data()
        return { id: d.id, date: data.date, description: data.description, notes: data.notes ?? null, duration_minutes: data.duration_minutes, staff_code: data.staff_code, staff_name: profMap.get(data.user_id) }
      }).sort((a, b) => b.date.localeCompare(a.date))
      setEntries(result)
      setLoading(false)
    })
  }, [project.id])

  const total = entries.reduce((s, e) => s + e.duration_minutes, 0)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-[#e5dfd5] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dfd5] shrink-0">
          <div>
            <h2 className="text-xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>{project.name}</h2>
            <p className="text-xs text-[#8a7f72] mt-0.5 font-light">{project.company?.name ?? ''}</p>
          </div>
          <button onClick={onClose} className="text-[#b5a99a] hover:text-[#1e1813]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#b5a99a] font-light">Keine Einträge für dieses Projekt</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[#faf8f5] z-10">
                <tr className="border-b border-[#e5dfd5]">
                  {['Datum', 'Beschreibung', 'Mitarbeiter', 'Dauer'].map((h, i) => (
                    <th key={i} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f0ea]">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-[#faf8f5]">
                    <td className="px-4 py-3 text-xs text-[#8a7f72] whitespace-nowrap font-light">{formatDateShort(e.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#1e1813] font-light">{e.description}</span>
                      {e.notes && <p className="text-xs text-[#b5a99a] font-light mt-0.5 truncate max-w-xs">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8a7f72] font-light whitespace-nowrap">{e.staff_name ?? e.staff_code}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#1e1813] whitespace-nowrap">{formatDuration(e.duration_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#e5dfd5] shrink-0 flex justify-between items-center">
          <span className="text-xs text-[#8a7f72] font-light">{entries.length} Einträge</span>
          <span className="text-sm font-medium text-[#1e1813]">{formatDuration(total)} gesamt</span>
        </div>
      </div>
    </div>
  )
}

function ProjectRow({ project, usedMinutes, editId, form, setForm, companies, saving, onEdit, onUpdate, onCancelEdit, onToggleActive, onToggleCompleted, onViewEntries, completed }: {
  project: Project; usedMinutes: Map<string, number>; editId: string | null
  form: { name: string; company_id: string; planned_hours: string }
  setForm: (f: { name: string; company_id: string; planned_hours: string }) => void
  companies: Company[]; saving: boolean; completed?: boolean
  onEdit: () => void; onUpdate: () => void; onCancelEdit: () => void
  onToggleActive: () => void; onToggleCompleted: () => void; onViewEntries: () => void
}) {
  const dim = completed ? 'opacity-40' : ''
  const used = (usedMinutes.get(project.id) ?? 0) / 60
  const pct = project.planned_hours ? Math.min(used / project.planned_hours * 100, 100) : 0
  const over = project.planned_hours ? used > project.planned_hours : false
  return (
    <>
      <tr className={`hover:bg-[#faf8f5] group ${completed ? 'bg-[#faf8f5]' : ''}`}>
        <td className="px-4 py-3 w-8">
          <button onClick={onToggleCompleted} title={completed ? 'Als offen markieren' : 'Als abgeschlossen markieren'}
            className={`transition-colors ${completed ? 'text-green-600 hover:text-[#8a7f72]' : 'text-[#e5dfd5] hover:text-green-600'}`}>
            {completed ? <CheckCircle size={16} /> : <Circle size={16} />}
          </button>
        </td>
        <td className={`px-4 py-3 text-sm font-light ${completed ? 'text-[#b5a99a] line-through' : 'text-[#1e1813]'}`}>
          <button onClick={onViewEntries} className="hover:underline text-left">{project.name}</button>
        </td>
        <td className={`px-4 py-3 ${dim}`}><CompanyBadge company={project.company} size="sm" /></td>
        <td className={`px-4 py-3 min-w-[140px] ${dim}`}>
          {project.planned_hours ? (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-light ${over ? 'text-red-500' : 'text-[#1e1813]'}`}>{Math.round(used * 10) / 10}h</span>
                <span className="text-[#b5a99a] font-light">/ {project.planned_hours}h</span>
              </div>
              <div className="h-1.5 bg-[#f5f0ea] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: over ? '#dc2626' : pct > 80 ? '#d97706' : '#16a34a' }} />
              </div>
            </div>
          ) : <span className="text-xs text-[#e5dfd5]">–</span>}
        </td>
        <td className={`px-4 py-3 ${dim}`}>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${project.is_active ? 'bg-green-50 text-green-700' : 'bg-[#f5f0ea] text-[#8a7f72]'}`}>
            {project.is_active ? 'Aktiv' : 'Inaktiv'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={onEdit} className="p-1.5 text-[#b5a99a] hover:text-[#2c2316] hover:bg-[#f0ebe3] rounded-lg"><Pencil size={14} /></button>
            <button onClick={onToggleActive} className="p-1.5 text-[#b5a99a] hover:text-[#1e1813] hover:bg-[#faf8f5] rounded-lg">{project.is_active ? <X size={14} /> : <Check size={14} />}</button>
          </div>
        </td>
      </tr>
      {editId === project.id && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-[#faf8f5] border-b border-[#e5dfd5]">
            <ProjectForm form={form} setForm={setForm} companies={companies} onSave={onUpdate} onCancel={onCancelEdit} saving={saving} />
          </td>
        </tr>
      )}
    </>
  )
}

function ProjectForm({ form, setForm, companies, onSave, onCancel, saving }: {
  form: { name: string; company_id: string; planned_hours: string }
  setForm: (f: { name: string; company_id: string; planned_hours: string }) => void
  companies: Company[]; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Projektname</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Website Redesign" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma</label>
          <CompanySelect companies={companies} value={form.company_id} onChange={id => setForm({ ...form, company_id: id })} />
        </div>
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Geplante Stunden <span className="text-[#b5a99a] normal-case">(optional)</span></label>
          <input type="number" min="0" step="0.5" value={form.planned_hours} onChange={e => setForm({ ...form, planned_hours: e.target.value })} placeholder="z.B. 40" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#8a7f72] border border-[#e5dfd5] rounded-lg font-light">Abbrechen</button>
        <button onClick={onSave} disabled={!form.name.trim() || !form.company_id || saving} className="px-4 py-2 text-sm bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
