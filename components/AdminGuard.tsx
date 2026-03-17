'use client'

import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'

interface AdminGuardProps {
  profile: Profile
  children: React.ReactNode
}

export default function AdminGuard({ profile, children }: AdminGuardProps) {
  const router = useRouter()

  if (profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center p-8 pt-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#f0ebe3] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-[#8a7f72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl text-[#1e1813] mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>Kein Zugriff</h2>
          <p className="text-sm text-[#8a7f72] mb-6 font-light">Du hast keine Berechtigung für den Admin-Bereich.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#2c2316] hover:bg-[#3d3220] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
