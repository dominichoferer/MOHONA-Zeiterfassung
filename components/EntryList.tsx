'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TimeEntry, Company, Profile } from '@/lib/types'
import { formatDuration, formatDateShort } from '@/lib/utils'
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react'
import CompanyBadge from './CompanyBadge'
import CompanySelect from './CompanySelect'
import EditEntryModal from './EditEntryModal'

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0]
}

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
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filterCompany, setFilterCompany] = useState('')

  const isAdmin = profile.role === 'admin'

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const dateTo = lastDayOfMonth(year, month)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  useEffect(() => {
    getDocs(collection(db, 'companies')).then(snap => {
      setCompanies(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => { loadEntries() }, [filterCompany, dateFrom, dateTo, isAdmin])

  async function loadEntries() {
    setLoading(true)
    const snap = await getDocs(
      isAdmin
        ? collection(db, 'time_entries')
        : query(collection(db, 'time_entries'), where('user_id', '==', profile.user_id))
    )
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

    result = result.filter(e => e.date >= dateFrom && e.date <= dateTo)
    if (filterCompany) result = result.filter(e => e.company_id === filterCompany)
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

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)

  return (
    <div>
      <div className="bg-white rounded-xl border border-[#e5dfd5] p-4 mb-4 flex items-center gap-3 flex-wrap">
        {/* Month navigator */}
        <div className="flex items-center gap-1 border border-[#e5dfd5] rounded-lg px-2 py-1.5">
          <button onClick={prevMonth} className="p-0.5 text-[#8a7f72] hover:text-[#1e1813]"><ChevronLeft size={15} /></button>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={nextMonth} className="p-0.5 text-[#8a7f72] hover:text-[#1e1813]"><ChevronRight size={15} /></button>
        </div>

        {/* Company filter */}
        <div className="w-48">
          <CompanySelect companies={companies} value={filterCompany} onChange={setFilterCompany} placeholder="Alle Firmen" />
        </div>

        {filterCompany && (
          <button onClick={() => setFilterCompany('')}
            className="flex items-center gap-1 text-xs text-[#8a7f72] hover:text-[#1e1813] border border-[#e5dfd5] rounded-lg px-3 py-2 font-light">
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
                <>
                  <tr key={entry.id} className="hover:bg-[#faf8f5] group transition-colors">
                    <td className="px-4 py-3 text-xs text-[#8a7f72] whitespace-nowrap font-light">{formatDateShort(entry.date)}</td>
                    <td className="px-4 py-3"><CompanyBadge company={entry.company} size="sm" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-[#1e1813] font-light">{entry.description}</span>
                        {entry.notes && (
                          <button onClick={() => toggleNotes(entry.id)}
                            className="text-[#b5a99a] hover:text-[#2c2316] transition-colors shrink-0">
                            {expandedNotes.has(entry.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
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
                  {entry.notes && expandedNotes.has(entry.id) && (
                    <tr key={`notes-${entry.id}`} className="bg-[#faf8f5]">
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 pb-3 pt-0">
                        <p className="text-xs text-[#8a7f72] font-light leading-relaxed border-l-2 border-[#e5dfd5] pl-3">{entry.notes}</p>
                      </td>
                    </tr>
                  )}
                </>
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
