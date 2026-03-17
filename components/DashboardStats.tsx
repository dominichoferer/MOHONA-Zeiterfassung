'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Role } from '@/lib/types'
import { db } from '@/lib/firebase'
import { TimeEntry, Company } from '@/lib/types'
import { formatDuration, todayISO } from '@/lib/utils'
import { Clock, TrendingUp, FileText } from 'lucide-react'
import CompanyBadge from './CompanyBadge'

interface DashboardStatsProps {
  dateFrom: string
  dateTo: string
  userId: string
  role: Role
}

export default function DashboardStats({ dateFrom, dateTo, userId, role }: DashboardStatsProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const today = todayISO()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const compSnap = await getDocs(collection(db, 'companies'))
      const compList = compSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
      setCompanies(compList)
      const compMap = new Map(compList.map(c => [c.id, c]))

      const entriesSnap = await getDocs(
        role === 'admin'
          ? collection(db, 'time_entries')
          : query(collection(db, 'time_entries'), where('user_id', '==', userId))
      )
      const raw = entriesSnap.docs
        .map(d => {
          const data = d.data()
          return { id: d.id, ...data, company: data.company_id ? compMap.get(data.company_id) : undefined } as TimeEntry
        })
        .filter(e => e.date >= dateFrom && e.date <= dateTo)
        .sort((a, b) => b.date.localeCompare(a.date))
      setEntries(raw)
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo, userId])

  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)
  const todayEntries = entries.filter(e => e.date === today)
  const todayMinutes = todayEntries.reduce((s, e) => s + e.duration_minutes, 0)

  const companyStats = companies
    .map(company => ({
      company,
      minutes: entries.filter(e => e.company_id === company.id).reduce((s, e) => s + e.duration_minutes, 0),
    }))
    .filter(s => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

  const maxMinutes = companyStats[0]?.minutes ?? 1

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Stunden gesamt', value: formatDuration(totalMinutes), icon: TrendingUp },
          { label: 'Heute', value: formatDuration(todayMinutes), icon: Clock },
          { label: 'Einträge', value: entries.length.toString(), icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e5dfd5] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#8a7f72] uppercase tracking-wide font-normal">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-[#f0ebe3] flex items-center justify-center">
                <Icon size={15} className="text-[#2c2316]" />
              </div>
            </div>
            <p className="text-3xl text-[#1e1813] font-light" style={{ fontFamily: 'Dazzle Unicase, sans-serif' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white rounded-xl border border-[#e5dfd5] p-5">
          <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 400 }}>Stunden nach Firma</h3>
          {companyStats.length === 0 ? (
            <p className="text-sm text-[#b5a99a] py-4 text-center font-light">Noch keine Einträge in diesem Zeitraum</p>
          ) : (
            <div className="space-y-3">
              {companyStats.map(({ company, minutes }) => (
                <div key={company.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#1e1813] font-light">{company.name}</span>
                    <span className="text-xs text-[#8a7f72] font-light">{formatDuration(minutes)}</span>
                  </div>
                  <div className="h-1.5 bg-[#f5f0ea] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(minutes / maxMinutes) * 100}%`, backgroundColor: company.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-[#e5dfd5] p-5">
          <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 400 }}>Heute</h3>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-[#b5a99a] py-4 text-center font-light">Noch keine Einträge heute</p>
          ) : (
            <div className="space-y-2.5">
              {todayEntries.slice(0, 6).map(entry => (
                <div key={entry.id} className="flex items-start gap-2">
                  <CompanyBadge company={entry.company} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#1e1813] truncate font-light">{entry.description}</p>
                    <p className="text-xs text-[#b5a99a] font-light">{formatDuration(entry.duration_minutes)}</p>
                  </div>
                </div>
              ))}
              {todayEntries.length > 6 && <p className="text-xs text-[#b5a99a] font-light">+{todayEntries.length - 6} weitere</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
