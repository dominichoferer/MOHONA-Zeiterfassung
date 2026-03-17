'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Profile } from '@/lib/types'
import { generateStaffCode } from '@/lib/utils'

interface AuthGuardProps {
  children: (profile: Profile) => React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [uid, setUid] = useState('')
  const [staffName, setStaffName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login')
        return
      }
      setUid(user.uid)
      const snap = await getDoc(doc(db, 'profiles', user.uid))
      if (snap.exists()) {
        setProfile({ id: user.uid, user_id: user.uid, ...snap.data() } as Profile)
      } else {
        setNeedsSetup(true)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  async function handleSetup() {
    if (!staffName.trim() || !uid) return
    setSaving(true)
    setError('')
    const code = generateStaffCode(staffName)
    const data: Omit<Profile, 'id' | 'user_id'> = {
      staff_name: staffName.trim(),
      staff_code: code,
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
    }
    try {
      await setDoc(doc(db, 'profiles', uid), data)
      setProfile({ id: uid, user_id: uid, ...data })
      setNeedsSetup(false)
    } catch {
      setError('Fehler beim Speichern. Bitte nochmal versuchen.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="w-7 h-7 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="bg-white rounded-xl border border-[#e5dfd5] shadow-sm p-8 w-full max-w-sm">
          <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-6 w-auto mb-8 invert opacity-80" />
          <h2 className="text-2xl text-[#1e1813] mb-1" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>Willkommen.</h2>
          <p className="text-sm text-[#8a7f72] mb-6 font-light">Wie lautet dein Name?</p>
          <input
            type="text"
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetup()}
            placeholder="Vor- und Nachname"
            className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 text-sm text-[#1e1813] placeholder-[#b5a99a] focus:outline-none focus:ring-2 focus:ring-[#2c2316] focus:border-transparent mb-4 font-light"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button
            onClick={handleSetup}
            disabled={!staffName.trim() || saving}
            className="w-full bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Wird gespeichert...' : 'Weiter'}
          </button>
        </div>
      </div>
    )
  }

  if (!profile) return null
  return <>{children(profile)}</>
}
