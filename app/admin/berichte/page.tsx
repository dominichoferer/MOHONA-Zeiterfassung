'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminGuard from '@/components/AdminGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TimeEntry, Company, Profile } from '@/lib/types'
import { formatDuration, startOfMonthISO } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function BerichtePage() {
  return (
    <AuthGuard>
      {(profile) => (
        <div className="min-h-screen bg-[#faf8f5]">
          <Navbar profile={profile} />
          <main className="pt-14 p-8">
            <AdminGuard profile={profile}><BerichteContent profile={profile} /></AdminGuard>
          </main>
        </div>
      )}
    </AuthGuard>
  )
}

function BerichteContent({ profile }: { profile: Profile }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(startOfMonthISO())
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  void profile

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [compSnap, profSnap, entrySnap] = await Promise.all([
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'profiles')),
        // date range on same field = no composite index needed
        getDocs(query(collection(db, 'time_entries'), where('date', '>=', dateFrom), where('date', '<=', dateTo), orderBy('date', 'desc'))),
      ])
      const compList = compSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
      const compMap = new Map(compList.map(c => [c.id, c]))
      const profMap = new Map(profSnap.docs.map(d => [d.id, { id: d.id, user_id: d.id, ...d.data() } as Profile]))
      setCompanies(compList)
      setEntries(entrySnap.docs.map(d => {
        const data = d.data()
        return { id: d.id, ...data, company: compMap.get(data.company_id), profile: profMap.get(data.user_id) } as TimeEntry
      }))
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo])

  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)

  const byCompany = companies.map(c => ({
    name: c.name, color: c.color,
    hours: entries.filter(e => e.company_id === c.id).reduce((s, e) => s + e.duration_minutes, 0) / 60,
    minutes: entries.filter(e => e.company_id === c.id).reduce((s, e) => s + e.duration_minutes, 0),
  })).filter(c => c.minutes > 0).sort((a, b) => b.minutes - a.minutes)

  const staffMap = new Map<string, { name: string; minutes: number }>()
  entries.forEach(e => {
    const name = e.profile?.staff_name ?? e.staff_code
    const ex = staffMap.get(e.staff_code) ?? { name, minutes: 0 }
    staffMap.set(e.staff_code, { name, minutes: ex.minutes + e.duration_minutes })
  })
  const byStaff = Array.from(staffMap.values()).sort((a, b) => b.minutes - a.minutes)

  const monthMap = new Map<string, number>()
  entries.forEach(e => { const m = e.date.substring(0, 7); monthMap.set(m, (monthMap.get(m) ?? 0) + e.duration_minutes) })
  const byMonth = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, minutes]) => ({ month: new Date(month + '-01').toLocaleDateString('de-AT', { month: 'short', year: '2-digit' }), hours: Math.round(minutes / 60 * 10) / 10 }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8 pt-4">
        <div>
          <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>Berichte & Auswertungen</h1>
          <p className="text-sm text-[#8a7f72] mt-1 font-light">Übersicht aller erfassten Zeiten.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#e5dfd5] rounded-lg px-4 py-2.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm text-[#1e1813] focus:outline-none font-light" />
          <span className="text-[#b5a99a] text-sm">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm text-[#1e1813] focus:outline-none font-light" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Gesamtstunden', value: formatDuration(totalMinutes) },
              { label: 'Einträge', value: entries.length.toString() },
              { label: 'Mitarbeiter', value: byStaff.length.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-[#e5dfd5] p-5">
                <p className="text-xs text-[#8a7f72] uppercase tracking-wide mb-2 font-normal">{label}</p>
                <p className="text-3xl text-[#1e1813] font-light" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#e5dfd5] p-5">
              <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}>Stunden nach Firma</h3>
              {byCompany.length === 0 ? <p className="text-sm text-[#b5a99a] text-center py-8 font-light">Keine Daten</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byCompany} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ea" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#b5a99a' }} tickFormatter={v => `${Math.round(Number(v))}h`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#8a7f72' }} width={80} />
                    <Tooltip formatter={(v) => [`${Math.round(Number(v) * 10) / 10}h`, 'Stunden']} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]}>{byCompany.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#e5dfd5] p-5">
              <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}>Stunden nach Mitarbeiter</h3>
              {byStaff.length === 0 ? <p className="text-sm text-[#b5a99a] text-center py-8 font-light">Keine Daten</p> : (
                <div className="space-y-3">
                  {byStaff.map(({ name, minutes }) => (
                    <div key={name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#1e1813] font-light">{name}</span>
                        <span className="text-xs text-[#8a7f72] font-light">{formatDuration(minutes)}</span>
                      </div>
                      <div className="h-1.5 bg-[#f5f0ea] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2c2316] rounded-full" style={{ width: `${(minutes / (byStaff[0]?.minutes ?? 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {byMonth.length > 1 && (
            <div className="bg-white rounded-xl border border-[#e5dfd5] p-5">
              <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}>Monatlicher Verlauf</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ea" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#b5a99a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#b5a99a' }} tickFormatter={v => `${v}h`} />
                  <Tooltip formatter={(v) => [`${v}h`, 'Stunden']} />
                  <Bar dataKey="hours" fill="#2c2316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5dfd5] flex items-center justify-between">
              <h3 className="text-base text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}>Alle Einträge im Zeitraum</h3>
              <span className="text-xs text-[#8a7f72] font-light">{entries.length} Einträge</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5dfd5] bg-[#faf8f5]">
                  {['Datum', 'Mitarbeiter', 'Firma', 'Beschreibung', 'Dauer'].map(h => (
                    <th key={h} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f0ea]">
                {entries.slice(0, 100).map(entry => (
                  <tr key={entry.id} className="hover:bg-[#faf8f5]">
                    <td className="px-4 py-3 text-xs text-[#8a7f72] font-light">{entry.date}</td>
                    <td className="px-4 py-3 text-xs text-[#1e1813] font-light">{entry.profile?.staff_name ?? entry.staff_code}</td>
                    <td className="px-4 py-3">
                      {entry.company && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: entry.company.color, color: entry.company.text_color }}>{entry.company.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1e1813] max-w-xs truncate font-light">{entry.description}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#1e1813]">{formatDuration(entry.duration_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 100 && <p className="text-center text-xs text-[#b5a99a] py-3 font-light">Nur die ersten 100 Einträge. Nutze den Export für alle Daten.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
