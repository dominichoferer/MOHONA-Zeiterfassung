'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Profile } from '@/lib/types'
import { LayoutDashboard, Plus, List, Download, Settings, LogOut, BarChart3, Building2, FolderOpen } from 'lucide-react'

interface NavbarProps {
  profile: Profile
}

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/eintraege',  label: 'Einträge',       icon: List },
  { href: '/export',     label: 'Export',         icon: Download },
]

const adminItems = [
  { href: '/admin',          label: 'Admin',     icon: Settings },
  { href: '/admin/firmen',   label: 'Firmen',    icon: Building2 },
  { href: '/admin/projekte', label: 'Projekte',  icon: FolderOpen },
  { href: '/admin/berichte', label: 'Berichte',  icon: BarChart3 },
]

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut(auth)
    router.replace('/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initial = profile.staff_name?.charAt(0)?.toUpperCase() ?? profile.staff_code?.charAt(0) ?? '?'

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#2c2316] flex items-center px-6 z-50">
      {/* Logo */}
      <a href="/dashboard" className="flex-shrink-0 mr-8">
        <img
          src="/logo-mohona-white.svg"
          alt="MOHONA"
          className="h-7 w-auto"
        />
      </a>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-all ${
              isActive(href)
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
          >
            <Icon size={14} />
            {label}
          </a>
        ))}

        {profile.role === 'admin' && (
          <>
            <div className="w-px h-4 bg-white/15 mx-2" />
            {adminItems.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/40 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon size={14} />
                {label}
              </a>
            ))}
          </>
        )}
      </nav>

      {/* Right: New Entry + User */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <a
          href="/neu"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            pathname === '/neu'
              ? 'bg-white text-[#2c2316]'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          <Plus size={14} />
          Neuer Eintrag
        </a>

        <div className="flex items-center gap-2.5 pl-3 border-l border-white/15">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">{initial}</span>
          </div>
          <span className="text-white/70 text-sm hidden xl:block">
            {profile.staff_name ?? profile.staff_code}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Abmelden"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
