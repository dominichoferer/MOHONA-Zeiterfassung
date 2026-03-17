'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminGuard from '@/components/AdminGuard'
import Navbar from '@/components/Navbar'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Profile } from '@/lib/types'
import { Building2, FolderOpen, BarChart3, Users } from 'lucide-react'

export default function AdminPage() {
  return (
    <AuthGuard>
      {(profile) => (
        <div className="min-h-screen bg-[#faf8f5]">
          <Navbar profile={profile} />
          <main className="pt-14 p-8">
            <AdminGuard profile={profile}><AdminContent profile={profile} /></AdminGuard>
          </main>
        </div>
      )}
    </AuthGuard>
  )
}

function AdminContent({ profile }: { profile: Profile }) {
  const [stats, setStats] = useState({ companies: 0, projects: 0, entries: 0, users: 0 })

  useEffect(() => {
    Promise.all([
      getCountFromServer(query(collection(db, 'companies'), where('is_active', '==', true))),
      getCountFromServer(query(collection(db, 'projects'), where('is_active', '==', true))),
      getCountFromServer(collection(db, 'time_entries')),
      getCountFromServer(collection(db, 'profiles')),
    ]).then(([c, p, e, u]) => setStats({ companies: c.data().count, projects: p.data().count, entries: e.data().count, users: u.data().count }))
  }, [])

  const cards = [
    { label: 'Firmen', value: stats.companies, icon: Building2, href: '/admin/firmen', desc: 'Firmen & Kunden verwalten' },
    { label: 'Projekte', value: stats.projects, icon: FolderOpen, href: '/admin/projekte', desc: 'Projekte verwalten' },
    { label: 'Einträge', value: stats.entries, icon: BarChart3, href: '/admin/berichte', desc: 'Alle Zeiteinträge & Berichte' },
    { label: 'Benutzer', value: stats.users, icon: Users, href: '/admin/berichte', desc: 'Team-Mitglieder' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10 pt-4">
        <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>
          Admin-Bereich
        </h1>
        <p className="text-sm text-[#8a7f72] mt-1 font-light">Willkommen, {profile.staff_name}.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, href, desc }) => (
          <a key={label} href={href} className="bg-white rounded-xl border border-[#e5dfd5] p-5 hover:border-[#2c2316] hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[#f0ebe3] rounded-xl flex items-center justify-center group-hover:bg-[#2c2316] transition-colors">
                <Icon size={18} className="text-[#2c2316] group-hover:text-white transition-colors" />
              </div>
              <span className="text-3xl font-light text-[#1e1813]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{value}</span>
            </div>
            <p className="text-sm font-medium text-[#1e1813]">{label}</p>
            <p className="text-xs text-[#8a7f72] mt-0.5 font-light">{desc}</p>
          </a>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[#e5dfd5] p-5">
        <h3 className="text-base text-[#1e1813] mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}>Schnellzugriff</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Neue Firma anlegen', href: '/admin/firmen' },
            { label: 'Neues Projekt anlegen', href: '/admin/projekte' },
            { label: 'Berichte ansehen', href: '/admin/berichte' },
          ].map(({ label, href }) => (
            <a key={href} href={href} className="flex items-center justify-center py-3 px-4 border border-[#e5dfd5] rounded-lg text-sm text-[#8a7f72] hover:text-[#1e1813] hover:border-[#2c2316] transition-all font-light">{label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
