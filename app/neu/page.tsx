'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import TimeEntryForm from '@/components/TimeEntryForm'
import BulkEntryModal from '@/components/BulkEntryModal'
import { Profile } from '@/lib/types'
import { Sparkles } from 'lucide-react'

export default function NeuPage() {
  return (
    <AuthGuard>
      {(profile) => <NeuContent profile={profile} />}
    </AuthGuard>
  )
}

function NeuContent({ profile }: { profile: Profile }) {
  const [showBulk, setShowBulk] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end justify-between mb-8 pt-4">
            <div>
              <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>
                Neuer Eintrag
              </h1>
              <p className="text-sm text-[#8a7f72] mt-1 font-light">Erfasse deine Arbeitszeit mit KI-Unterstützung oder manuell.</p>
            </div>
            <button onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 border border-[#2c2316] text-[#2c2316] hover:bg-[#2c2316] hover:text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Sparkles size={15} />KI-Bulk Eingabe
            </button>
          </div>
          <TimeEntryForm profile={profile} />
        </div>
      </main>

      {showBulk && (
        <BulkEntryModal
          profile={profile}
          onClose={() => setShowBulk(false)}
          onSaved={() => { setShowBulk(false); router.push('/eintraege') }}
        />
      )}
    </div>
  )
}
