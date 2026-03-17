'use client'

import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import DashboardStats from '@/components/DashboardStats'
import DateNavigator from '@/components/DateNavigator'
import { Profile } from '@/lib/types'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  return (
    <AuthGuard>
      {(profile) => <DashboardContent profile={profile} />}
    </AuthGuard>
  )
}

function DashboardContent({ profile }: { profile: Profile }) {
  const now = new Date()
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [dateTo, setDateTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14">
        {/* Hero Header */}
        <div className="relative w-full overflow-hidden" style={{ height: '560px' }}>
          <img src="/dashboard-header.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ paddingBottom: '60px' }}>
            <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-10 w-auto mb-8 opacity-80" style={{ marginTop: '-80px' }} />
            <h1 className="text-6xl text-white" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300, letterSpacing: '0.08em' }}>
              Hallo, {profile.staff_name?.split(' ')[0] ?? profile.staff_code ?? 'dort'}.
            </h1>
            <p className="text-sm text-white/60 mt-3 font-light tracking-wide">
              {dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`}
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <DateNavigator onChange={(from, to) => { setDateFrom(from); setDateTo(to) }} />
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
