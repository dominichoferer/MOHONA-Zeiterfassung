'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminGuard from '@/components/AdminGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company, Project, Profile } from '@/lib/types'
import { Plus, Pencil, X, Check, ChevronDown } from 'lucide-react'
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
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', company_id: '' })
  const [saving, setSaving] = useState(false)
  void profile

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'companies')),
      getDocs(collection(db, 'projects')),
    ]).then(([c, p]) => {
      const compList = c.docs.map(d => ({ id: d.id, ...d.data() } as Company)).filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name))
      const compMap = new Map(compList.map(c => [c.id, c]))
      setCompanies(compList)
      setProjects(p.docs.map(d => {
        const data = d.data()
        return { id: d.id, ...data, company: compMap.get(data.company_id) } as Project
      }))
      setLoading(false)
    })
  }, [])

  const filtered = filterCompany ? projects.filter(p => p.company_id === filterCompany) : projects

  async function handleAdd() {
    if (!form.name.trim() || !form.company_id) return
    setSaving(true)
    const ref = await addDoc(collection(db, 'projects'), { name: form.name.trim(), company_id: form.company_id, is_active: true, created_at: new Date().toISOString() })
    const company = companies.find(c => c.id === form.company_id)
    setProjects(prev => [...prev, { id: ref.id, name: form.name.trim(), company_id: form.company_id, is_active: true, created_at: new Date().toISOString(), company }].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', company_id: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    await updateDoc(doc(db, 'projects', id), { name: form.name, company_id: form.company_id })
    const company = companies.find(c => c.id === form.company_id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: form.name, company_id: form.company_id, company } : p))
    setEditId(null)
    setSaving(false)
  }

  async function toggleActive(project: Project) {
    await updateDoc(doc(db, 'projects', project.id), { is_active: !project.is_active })
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_active: !p.is_active } : p))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8 pt-4">
        <div>
          <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>
            Projekte
          </h1>
          <p className="text-sm text-[#8a7f72] mt-1 font-light">Verwalte Projekte je Firma.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', company_id: '' }) }}
          className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] text-white text-sm font-medium px-4 py-2.5 rounded-lg">
          <Plus size={15} />Neues Projekt
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e5dfd5] p-4 mb-4">
        <div className="relative inline-block">
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
            className="border border-[#e5dfd5] rounded-lg pl-3 pr-8 py-2 text-sm text-[#1e1813] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light">
            <option value="">Alle Firmen</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border-2 border-[#2c2316] p-5 mb-4">
          <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Neues Projekt anlegen</h3>
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
                {['Projekt', 'Firma', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f0ea]">
              {filtered.map(project => (
                <>
                  <tr key={project.id} className="hover:bg-[#faf8f5] group">
                    <td className="px-4 py-3 text-sm text-[#1e1813] font-light">{project.name}</td>
                    <td className="px-4 py-3"><CompanyBadge company={project.company} size="sm" /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${project.is_active ? 'bg-green-50 text-green-700' : 'bg-[#f5f0ea] text-[#8a7f72]'}`}>
                        {project.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setForm({ name: project.name, company_id: project.company_id }); setEditId(project.id); setShowAdd(false) }} className="p-1.5 text-[#b5a99a] hover:text-[#2c2316] hover:bg-[#f0ebe3] rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(project)} className="p-1.5 text-[#b5a99a] hover:text-[#1e1813] hover:bg-[#faf8f5] rounded-lg">{project.is_active ? <X size={14} /> : <Check size={14} />}</button>
                      </div>
                    </td>
                  </tr>
                  {editId === project.id && (
                    <tr key={`edit-${project.id}`}>
                      <td colSpan={4} className="px-4 py-4 bg-[#faf8f5] border-b border-[#e5dfd5]">
                        <ProjectForm form={form} setForm={setForm} companies={companies} onSave={() => handleUpdate(project.id)} onCancel={() => setEditId(null)} saving={saving} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ProjectForm({ form, setForm, companies, onSave, onCancel, saving }: {
  form: { name: string; company_id: string }
  setForm: (f: { name: string; company_id: string }) => void
  companies: Company[]; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Projektname</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Website Redesign" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma</label>
          <div className="relative">
            <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
              className="w-full border border-[#e5dfd5] rounded-lg px-4 py-2.5 pr-9 text-sm text-[#1e1813] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light">
              <option value="">Firma wählen</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
          </div>
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
