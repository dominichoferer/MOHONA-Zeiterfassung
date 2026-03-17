'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TimeEntry, Company, Profile } from '@/lib/types'
import { formatDuration, formatDateShort } from '@/lib/utils'
import { Pencil, Trash2, ChevronDown, X } from 'lucide-react'
import CompanyBadge from './CompanyBadge'
import EditEntryModal from './EditEntryModal'

interface EntryListProps {
  profile: Profile
}

export default function EntryList({ profile }: EntryListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [filterCompany, setFilterCompany] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const isAdmin = profile.role === 'admin'

  useEffect(() => {
    getDocs(collection(db, 'companies')).then(snap => {
      setCompanies(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => { loadEntries() }, [filterCompany, filterDateFrom, filterDateTo, isAdmin])

  async function loadEntries() {
    setLoading(true)

    // Fetch entries: admin gets all, user gets own only (single where = no composite index)
    const snap = await getDocs(
      isAdmin
        ? collection(db, 'time_entries')
        : query(collection(db, 'time_entries'), where('user_id', '==', profile.user_id))
    )

    // Load lookup data
    const [compSnap, projSnap, profSnap] = await Promise.all([
      getDocs(collection(db, 'companies')),
      getDocs(collection(db, 'projects')),
      isAdmin ? getDocs(collection(db, 'profiles')) : Promise.resolve(null),
    ])
    const compMap = new Map(compSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Company]))
    const projMap = new Map(projSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]))
    const profMap = profSnap ? new Map(profSnap.docs.map(d => [d.id, { id: d.id, user_id: d.id, ...d.data() } as Profile])) : new Map()

    let result = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id, ...data,
        company: data.company_id ? compMap.get(data.company_id) : undefined,
        project: data.project_id ? projMap.get(data.project_id) : undefined,
        profile: profMap.get(data.user_id),
      } as TimeEntry
    })

    // Filter client-side
    if (filterCompany) result = result.filter(e => e.company_id === filterCompany)
    if (filterDateFrom) result = result.filter(e => e.date >= filterDateFrom)
    if (filterDateTo) result = result.filter(e => e.date <= filterDateTo)

    // Sort by date desc
    result.sort((a, b) => b.date.localeCompare(a.date))

    setEntries(result)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteDoc(doc(db, 'time_entries', id))
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
    setDeleting(false)
  }

  const hasFilters = filterCompany || filterDateFrom || filterDateTo
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)

  return (
    <div>
      <div className="bg-white rounded-xl border border-[#e5dfd5] p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
            className="border border-[#e5dfd5] rounded-lg pl-3 pr-8 py-2 text-sm text-[#1e1813] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light">
            <option value="">Alle Firmen</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5a99a] pointer-events-none" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8a7f72] font-light">Von</span>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="border border-[#e5dfd5] rounded-lg px-3 py-2 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light" />
          <span className="text-xs text-[#8a7f72] font-light">bis</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="border border-[#e5dfd5] rounded-lg px-3 py-2 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light" />
        </div>

        {hasFilters && (
          <button onClick={() => { setFilterCompany(''); setFilterDateFrom(''); setFilterDateTo('') }}
            className="flex items-center gap-1 text-xs text-[#8a7f72] hover:text-[#1e1813] border border-[#e5dfd5] rounded-lg px-3 py-2 hover:border-[#b5a99a] font-light">
            <X size={12} />Filter zurücksetzen
          </button>
        )}

        <div className="ml-auto text-xs text-[#8a7f72] font-light">
          {entries.length} Einträge · {formatDuration(totalMinutes)} gesamt
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#b5a99a] font-light">Keine Einträge gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dfd5] bg-[#faf8f5]">
                {['Datum', 'Firma', 'Beschreibung', 'Projekt', 'Dauer', ...(isAdmin ? ['Mitarbeiter'] : []), ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f0ea]">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-[#faf8f5] group transition-colors">
                  <td className="px-4 py-3 text-xs text-[#8a7f72] whitespace-nowrap font-light">{formatDateShort(entry.date)}</td>
                  <td className="px-4 py-3"><CompanyBadge company={entry.company} size="sm" /></td>
                  <td className="px-4 py-3 text-sm text-[#1e1813] max-w-xs truncate font-light">{entry.description}</td>
                  <td className="px-4 py-3 text-xs text-[#8a7f72] font-light">{(entry.project as {name?: string})?.name ?? <span className="text-[#e5dfd5]">–</span>}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[#1e1813] whitespace-nowrap">{formatDuration(entry.duration_minutes)}</td>
                  {isAdmin && <td className="px-4 py-3 text-xs text-[#8a7f72] font-light">{entry.profile?.staff_name ?? entry.staff_code}</td>}
                  <td className="px-4 py-3">
                    {(isAdmin || entry.user_id === profile.user_id) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditEntry(entry)} className="p-1.5 text-[#b5a99a] hover:text-[#2c2316] hover:bg-[#f0ebe3] rounded-lg"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-[#b5a99a] hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-[#e5dfd5]">
            <h3 className="text-xl text-[#1e1813] mb-2" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>Eintrag löschen?</h3>
            <p className="text-sm text-[#8a7f72] mb-6 font-light">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm text-[#8a7f72] border border-[#e5dfd5] rounded-lg font-light">Abbrechen</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="flex-1 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50">
                {deleting ? 'Löschen...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editEntry && (
        <EditEntryModal entry={editEntry} onClose={() => setEditEntry(null)}
          onSaved={updated => { setEntries(prev => prev.map(e => e.id === updated.id ? updated : e)); setEditEntry(null) }} />
      )}
    </div>
  )
}
