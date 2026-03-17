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
      <main className="pt-14 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10 pt-4">
            <div>
              <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>
                Hallo, {profile.staff_name?.split(' ')[0] ?? profile.staff_code ?? 'dort'}.
              </h1>
              <p className="text-sm text-[#8a7f72] mt-1 font-light">
                Deine Übersicht für diese{period === 'week' ? ' Woche' : 'n Monat'}.
              </p>
            </div>
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
      </main>
    </div>
  )
}
