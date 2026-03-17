'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/dashboard')
    })
    return () => unsub()
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/dashboard')
    } catch {
      setError('E-Mail oder Passwort falsch. Bitte nochmal versuchen.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#faf8f5]">
      {/* Left – Branding */}
      <div className="hidden lg:flex lg:w-[460px] bg-[#2c2316] flex-col justify-between p-10">
        <div>
          <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-8 w-auto mb-14" />
          <h1 className="text-white leading-tight mb-5" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontSize: '42px', fontWeight: 300 }}>
            Zeit erfassen.<br />
            <span className="text-white/40">Einfach & präzise.</span>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed font-light">
            Erfasse deine Arbeitszeit für alle Projekte und Kunden —<br />
            mit KI-Unterstützung oder manuell.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { text: 'KI-Schnelleingabe in natürlicher Sprache' },
            { text: 'Auswertungen nach Firma und Projekt' },
            { text: 'Export als CSV oder PDF' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3">
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <span className="text-white/40 text-sm font-light">{item.text}</span>
            </div>
          ))}
          <p className="text-white/20 text-xs pt-4 font-light">© {new Date().getFullYear()} MOHONA</p>
        </div>
      </div>

      {/* Right – Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <img src="/logo-mohona-white.svg" alt="MOHONA" className="h-8 w-auto invert" />
          </div>

          <h2 className="mb-1 text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontSize: '32px', fontWeight: 300 }}>
            Anmelden
          </h2>
          <p className="text-sm text-[#8a7f72] mb-8 font-light">Melde dich mit deinem Team-Account an.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.com"
                required
                className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 text-sm text-[#1e1813] placeholder-[#b5a99a] focus:outline-none focus:ring-2 focus:ring-[#2c2316] focus:border-transparent bg-white font-light"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-[#e5dfd5] rounded-lg px-4 py-3 pr-11 text-sm text-[#1e1813] placeholder-[#b5a99a] focus:outline-none focus:ring-2 focus:ring-[#2c2316] focus:border-transparent bg-white font-light"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b5a99a] hover:text-[#8a7f72]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full bg-[#2c2316] hover:bg-[#3d3220] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg text-sm transition-colors mt-2"
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <p className="text-center text-xs text-[#b5a99a] mt-8 font-light">
            Noch keinen Account? Bitte beim Admin melden.
          </p>
        </div>
      </div>
    </div>
  )
}
