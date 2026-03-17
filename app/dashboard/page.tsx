'use client'

import { useState, useRef } from 'react'
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

const QUOTES = [
  'Großes entsteht aus kleinen Schritten.',
  'Qualität ist kein Zufall.',
  'Ideen brauchen Mut. Mut braucht Anfänge.',
  'Wer aufhört besser zu werden, hat aufgehört gut zu sein.',
  'Kreativität ist Intelligenz, die Spaß hat.',
  'Das Beste kommt, wenn man nicht aufgibt.',
  'Jeder Tag ist eine neue Chance.',
  'Weniger, aber besser.',
  'Erst denken, dann gestalten.',
  'Details machen den Unterschied.',
  'Gut ist der Feind von großartig.',
  'Einfachheit ist die höchste Form der Raffinesse.',
  'Form follows function.',
  'Mach es mit Leidenschaft oder gar nicht.',
  'Das Ziel ist Exzellenz, nicht Perfektion.',
  'Vertraue dem Prozess.',
  'Jede Idee beginnt mit einem leeren Blatt.',
  'Gestalte die Welt, die du sehen willst.',
  'Mut zur Lücke – und dann füll sie.',
  'Arbeit, die begeistert, begeistert auch andere.',
  'Manchmal ist weniger Rauschen mehr Signal.',
  'Ein guter Tag beginnt mit einem klaren Kopf.',
  'Stärken stärken statt Schwächen schwächen.',
  'Hinter jedem Projekt steckt ein Mensch.',
  'Mach heute etwas, worauf du morgen stolz bist.',
  'Perfektion ist ein Weg, kein Ziel.',
  'Fokus schlägt Fleiss.',
  'Wer fragt, führt.',
  'Neugier ist der Motor des Fortschritts.',
  'Ästhetik ist keine Kleinigkeit.',
]

function dailyQuote(): string {
  const d = new Date()
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

function DashboardContent({ profile }: { profile: Profile }) {
  const now = new Date()
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [dateTo, setDateTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])
  const [spotlight, setSpotlight] = useState<{ x: number; y: number } | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14">
        {/* Hero Header */}
        <div ref={heroRef} className="relative w-full overflow-hidden" style={{ height: '560px' }}
          onMouseMove={e => {
            const rect = heroRef.current!.getBoundingClientRect()
            setSpotlight({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }}
          onMouseLeave={() => setSpotlight(null)}>
          <img src="/dashboard-header.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/50" />
          {spotlight && (
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `radial-gradient(150px circle at ${spotlight.x}px ${spotlight.y}px, rgba(245,236,220,0.18) 0%, transparent 100%)`,
            }} />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ paddingBottom: '60px' }}>
            <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-10 w-auto mb-8 opacity-80" style={{ marginTop: '-80px' }} />
            <h1 className="text-6xl text-white" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300, letterSpacing: '0.08em' }}>
              Hallo, {profile.staff_name?.split(' ')[0] ?? profile.staff_code ?? 'dort'}.
            </h1>
            <p className="text-sm text-white/60 mt-3 font-light tracking-wide italic">
              {dailyQuote()}
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
