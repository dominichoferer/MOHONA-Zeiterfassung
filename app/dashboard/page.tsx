'use client'

import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import DashboardStats from '@/components/DashboardStats'
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
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14">
        {/* Hero Header */}
        <div className="relative w-full overflow-hidden" style={{ height: '450px' }}>
          <img src="/dashboard-header.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl text-white" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300, letterSpacing: '0.08em' }}>
              Hallo, {profile.staff_name?.split(' ')[0] ?? profile.staff_code ?? 'dort'}.
            </h1>
            <p className="text-sm text-white/60 mt-3 font-light tracking-wide">
              Deine Übersicht für diese{period === 'week' ? ' Woche' : 'n Monat'}.
            </p>
          </div>
        </div>

        <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-end mb-10">
            <div className="flex items-center gap-3">
              <div className="flex bg-white border border-[#e5dfd5] rounded-lg p-1">
                {(['week', 'month'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                      period === p
                        ? 'bg-[#2c2316] text-white shadow-sm font-medium'
                        : 'text-[#8a7f72] hover:text-[#1e1813]'
                    }`}
                  >
                    {p === 'week' ? 'Woche' : 'Monat'}
                  </button>
                ))}
              </div>
              <a
                href="/neu"
                className="flex items-center gap-2 bg-[#2c2316] hover:bg-[#3d3220] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus size={15} />
                Neuer Eintrag
              </a>
            </div>
          </div>
          <DashboardStats period={period} userId={profile.user_id} />
        </div>
        </div>
      </main>
    </div>
  )
}
