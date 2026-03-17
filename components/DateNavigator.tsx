'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS_FULL = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function todayStr(): string { return new Date().toISOString().split('T')[0] }
function lastDay(year: number, month: number): string { return new Date(year, month, 0).toISOString().split('T')[0] }

interface DateNavigatorProps {
  onChange: (dateFrom: string, dateTo: string) => void
}

export default function DateNavigator({ onChange }: DateNavigatorProps) {
  const now = new Date()
  const [mode, setMode] = useState<'month' | 'day' | 'all'>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [day, setDay] = useState(todayStr())

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  useEffect(() => {
    if (mode === 'all') {
      onChange('2000-01-01', '2099-12-31')
    } else if (mode === 'month') {
      onChange(`${year}-${String(month).padStart(2, '0')}-01`, lastDay(year, month))
    } else {
      onChange(day, day)
    }
  }, [mode, year, month, day])

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }
  function prevDay() { const d = new Date(day + 'T00:00:00'); d.setDate(d.getDate() - 1); setDay(d.toISOString().split('T')[0]) }
  function nextDay() { const d = new Date(day + 'T00:00:00'); d.setDate(d.getDate() + 1); setDay(d.toISOString().split('T')[0]) }

  function goToday() {
    if (mode === 'day') { setDay(todayStr()) }
    else { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }
  }

  const isCurrentPeriod = mode === 'day'
    ? day === todayStr()
    : mode === 'month' && year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex items-center gap-2">
      {/* Mode toggle */}
      <div className="flex bg-[#f5f0ea] rounded-lg p-0.5">
        {(['month', 'day', 'all'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${mode === m ? 'bg-white text-[#1e1813] shadow-sm font-medium' : 'text-[#8a7f72] font-light'}`}>
            {m === 'month' ? 'Monat' : m === 'day' ? 'Tag' : 'Gesamt'}
          </button>
        ))}
      </div>

      {/* Navigator — hidden in 'all' mode */}
      {mode !== 'all' && (
        <div className="flex items-center gap-1 bg-white border border-[#e5dfd5] rounded-lg px-2 py-1.5">
          <button onClick={mode === 'month' ? prevMonth : prevDay} className="p-0.5 text-[#8a7f72] hover:text-[#1e1813]">
            <ChevronLeft size={15} />
          </button>
          {mode === 'month' ? (
            <>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
                {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          ) : (
            <input type="date" value={day} onChange={e => setDay(e.target.value)}
              className="text-sm text-[#1e1813] focus:outline-none font-light bg-transparent cursor-pointer" />
          )}
          <button onClick={mode === 'month' ? nextMonth : nextDay} className="p-0.5 text-[#8a7f72] hover:text-[#1e1813]">
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Heute button — nur bei Monat/Tag */}
      {mode !== 'all' && (
        <button onClick={goToday}
          className={`text-xs border rounded-lg px-2.5 py-1.5 font-light transition-colors ${isCurrentPeriod ? 'border-[#e5dfd5] text-[#b5a99a] bg-white cursor-default' : 'border-[#e5dfd5] text-[#8a7f72] hover:text-[#1e1813] bg-white hover:border-[#b5a99a]'}`}
          disabled={isCurrentPeriod}>
          Heute
        </button>
      )}
    </div>
  )
}
