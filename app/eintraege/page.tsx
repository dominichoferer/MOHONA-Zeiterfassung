'use client'

import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import EntryList from '@/components/EntryList'
import { Profile } from '@/lib/types'

export default function EintraegePage() {
  return (
    <AuthGuard>
      {(profile) => <EintraegeContent profile={profile} />}
    </AuthGuard>
  )
}

function EintraegeContent({ profile }: { profile: Profile }) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 pt-4">
            <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>
              Alle Einträge
            </h1>
            <p className="text-sm text-[#8a7f72] mt-1 font-light">
              {profile.role === 'admin' ? 'Alle Einträge des Teams' : 'Deine erfassten Arbeitszeiten'}
            </p>
          </div>
          <EntryList profile={profile} />
        </div>
      </main>
    </div>
  )
}
