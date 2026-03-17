'use client'

import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import DashboardStats from '@/components/DashboardStats'
import { Profile } from '@/lib/types'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0]
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      {(profile) => <DashboardContent profile={profile} />}
    </AuthGuard>
  )
}

function DashboardContent({ profile }: { profile: Profile }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

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

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14">
        {/* Hero Header */}
        <div className="relative w-full overflow-hidden" style={{ height: '560px' }}>
          <img src="/dashboard-header.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-10 w-auto mb-6 opacity-80" />
            <h1 className="text-6xl text-white" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300, letterSpacing: '0.08em' }}>
              Hallo, {profile.staff_name?.split(' ')[0] ?? profile.staff_code ?? 'dort'}.
            </h1>
            <p className="text-sm text-white/60 mt-3 font-light tracking-wide">
              Deine Übersicht für {MONTHS[month - 1]} {year}.
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              {/* Month navigator */}
              <div className="flex items-center gap-2 bg-white border border-[#e5dfd5] rounded-lg px-3 py-2">
                <button onClick={prevMonth} className="p-1 text-[#8a7f72] hover:text-[#1e1813] rounded transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={nextMonth} className="p-1 text-[#8a7f72] hover:text-[#1e1813] rounded transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              <a href="/neu"
                className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                <Plus size={15} />Neuer Eintrag
              </a>
            </div>
            <DashboardStats dateFrom={dateFrom} dateTo={dateTo} userId={profile.user_id} />
          </div>
        </div>
      </main>
    </div>
  )
}
