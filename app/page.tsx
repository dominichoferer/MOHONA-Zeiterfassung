'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      router.replace(user ? '/dashboard' : '/login')
    })
    return () => unsub()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="w-8 h-8 border-2 border-[#116dff] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
