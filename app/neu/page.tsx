'use client'

import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import TimeEntryForm from '@/components/TimeEntryForm'
import { Profile } from '@/lib/types'

export default function NeuPage() {
  return (
    <AuthGuard>
      {(profile) => <NeuContent profile={profile} />}
    </AuthGuard>
  )
}

function NeuContent({ profile }: { profile: Profile }) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 pt-4">
            <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>
              Neuer Eintrag
            </h1>
            <p className="text-sm text-[#8a7f72] mt-1 font-light">Erfasse deine Arbeitszeit mit KI-Unterstützung oder manuell.</p>
          </div>
          <TimeEntryForm profile={profile} />
        </div>
      </main>
    </div>
  )
}
