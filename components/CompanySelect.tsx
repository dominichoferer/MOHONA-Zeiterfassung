'use client'

import { useState, useRef, useEffect } from 'react'
import { Company } from '@/lib/types'
import { ChevronDown, Search } from 'lucide-react'

interface CompanySelectProps {
  companies: Company[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export default function CompanySelect({ companies, value, onChange, placeholder = 'Firma wählen' }: CompanySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = companies.find(c => c.id === value)
  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-[#e5dfd5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2c2316]"
      >
        {selected ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: selected.color, color: selected.text_color }}>
            {selected.name}
          </span>
        ) : (
          <span className="text-[#b5a99a] font-light text-sm">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-[#b5a99a] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] bg-white border border-[#e5dfd5] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#e5dfd5]">
            <div className="flex items-center gap-2 border border-[#e5dfd5] rounded-lg px-2.5 py-1.5 bg-[#faf8f5]">
              <Search size={12} className="text-[#b5a99a] shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="flex-1 text-xs text-[#1e1813] focus:outline-none font-light bg-transparent"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {value && (
              <button
                onClick={() => { onChange(''); setOpen(false); setSearch('') }}
                className="w-full text-left px-3 py-2 text-xs text-[#b5a99a] hover:bg-[#faf8f5] font-light"
              >
                — Keine Auswahl
              </button>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#faf8f5] transition-colors ${value === c.id ? 'bg-[#f5f0ea]' : ''}`}
              >
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: c.color, color: c.text_color }}>
                  {c.name}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#b5a99a] text-center font-light">Keine Treffer</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
