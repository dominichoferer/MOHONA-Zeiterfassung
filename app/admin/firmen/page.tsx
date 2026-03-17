'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminGuard from '@/components/AdminGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company, Profile } from '@/lib/types'
import { Plus, Pencil, Check, X } from 'lucide-react'

const PRESET_COLORS = [
  { color: '#2c2316', text: '#ffffff' },
  { color: '#16a34a', text: '#ffffff' },
  { color: '#d97706', text: '#ffffff' },
  { color: '#dc2626', text: '#ffffff' },
  { color: '#9333ea', text: '#ffffff' },
  { color: '#0891b2', text: '#ffffff' },
  { color: '#ea580c', text: '#ffffff' },
  { color: '#1e1813', text: '#ffffff' },
  { color: '#e5dfd5', text: '#1e1813' },
]

const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-4 py-2.5 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light"

export default function FirmenPage() {
  return (
    <AuthGuard>
      {(profile) => (
        <div className="min-h-screen bg-[#faf8f5]">
          <Navbar profile={profile} />
          <main className="pt-14 p-8">
            <AdminGuard profile={profile}><FirmenContent profile={profile} /></AdminGuard>
          </main>
        </div>
      )}
    </AuthGuard>
  )
}

function FirmenContent({ profile }: { profile: Profile }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#2c2316', text_color: '#ffffff' })
  const [saving, setSaving] = useState(false)
  void profile

  useEffect(() => {
    getDocs(query(collection(db, 'companies'), orderBy('name')))
      .then(snap => { setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))); setLoading(false) })
  }, [])

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const ref = await addDoc(collection(db, 'companies'), {
      name: form.name.trim(), color: form.color, text_color: form.text_color, is_active: true, created_at: new Date().toISOString()
    })
    const newCompany: Company = { id: ref.id, name: form.name.trim(), color: form.color, text_color: form.text_color, is_active: true, created_at: new Date().toISOString() }
    setCompanies(prev => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', color: '#2c2316', text_color: '#ffffff' })
    setShowAdd(false)
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    await updateDoc(doc(db, 'companies', id), { name: form.name, color: form.color, text_color: form.text_color })
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, name: form.name, color: form.color, text_color: form.text_color } : c))
    setEditId(null)
    setSaving(false)
  }

  async function toggleActive(company: Company) {
    await updateDoc(doc(db, 'companies', company.id), { is_active: !company.is_active })
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_active: !c.is_active } : c))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8 pt-4">
        <div>
          <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>
            Firmen & Kunden
          </h1>
          <p className="text-sm text-[#8a7f72] mt-1 font-light">Verwalte alle Firmen und ihre Farben.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', color: '#2c2316', text_color: '#ffffff' }) }}
          className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          <Plus size={15} />Neue Firma
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border-2 border-[#2c2316] p-5 mb-4">
          <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Neue Firma anlegen</h3>
          <CompanyForm form={form} setForm={setForm} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dfd5] bg-[#faf8f5]">
                {['Firma', 'Farbe', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f0ea]">
              {companies.map(company => (
                <>
                  <tr key={company.id} className="hover:bg-[#faf8f5] group">
                    <td className="px-4 py-3 text-sm text-[#1e1813] font-light">{company.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: company.color, color: company.text_color }}>{company.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${company.is_active ? 'bg-green-50 text-green-700' : 'bg-[#f5f0ea] text-[#8a7f72]'}`}>
                        {company.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setForm({ name: company.name, color: company.color, text_color: company.text_color }); setEditId(company.id); setShowAdd(false) }} className="p-1.5 text-[#b5a99a] hover:text-[#2c2316] hover:bg-[#f0ebe3] rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(company)} className="p-1.5 text-[#b5a99a] hover:text-[#1e1813] hover:bg-[#faf8f5] rounded-lg">{company.is_active ? <X size={14} /> : <Check size={14} />}</button>
                      </div>
                    </td>
                  </tr>
                  {editId === company.id && (
                    <tr key={`edit-${company.id}`}>
                      <td colSpan={4} className="px-4 py-4 bg-[#faf8f5] border-b border-[#e5dfd5]">
                        <CompanyForm form={form} setForm={setForm} onSave={() => handleUpdate(company.id)} onCancel={() => setEditId(null)} saving={saving} />
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

function CompanyForm({ form, setForm, onSave, onCancel, saving }: {
  form: { name: string; color: string; text_color: string }
  setForm: (f: { name: string; color: string; text_color: string }) => void
  onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Name</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Firmenname" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Farbe</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(({ color, text }) => (
            <button key={color} onClick={() => setForm({ ...form, color, text_color: text })}
              className={`w-8 h-8 rounded-lg transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-[#2c2316] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: color }} />
          ))}
          <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-[#e5dfd5]" />
        </div>
        <div className="flex gap-2 mt-2">
          {['#ffffff', '#1e1813'].map(c => (
            <button key={c} onClick={() => setForm({ ...form, text_color: c })}
              className={`px-3 py-1 rounded-lg text-xs border ${form.text_color === c ? 'border-[#2c2316] text-[#2c2316]' : 'border-[#e5dfd5] text-[#8a7f72]'}`}>
              {c === '#ffffff' ? 'Weiß' : 'Schwarz'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#8a7f72] font-light">Vorschau:</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: form.color, color: form.text_color }}>{form.name || 'Firmenname'}</span>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#8a7f72] border border-[#e5dfd5] rounded-lg font-light">Abbrechen</button>
        <button onClick={onSave} disabled={!form.name.trim() || saving} className="px-4 py-2 text-sm bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
