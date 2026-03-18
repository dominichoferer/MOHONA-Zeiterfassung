'use client'

import { useEffect, useRef, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Company, Project, TimeEntry, Profile } from '@/lib/types'
import { formatDuration, startOfMonthISO } from '@/lib/utils'
import { Download, FileText, FileSpreadsheet, Check, ChevronDown, X } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ExportPage() {
  return (
    <AuthGuard>
      {(profile) => <ExportContent profile={profile} />}
    </AuthGuard>
  )
}

// ── Multi-Select Dropdown ────────────────────────────────────────────────────

interface MultiSelectOption { id: string; name: string; color?: string; textColor?: string }

function MultiSelectDropdown({ options, selected, onChange, placeholder }: {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // selected = [] means "Alle" (no filter)
  const allSelected = selected.length === 0
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

  function handleItemClick(id: string) {
    if (allSelected) {
      // from "all" → select only this one
      onChange([id])
    } else if (selected.includes(id)) {
      // deselect this one
      const next = selected.filter(s => s !== id)
      onChange(next) // if next = [], "Alle" is auto-active again
    } else {
      // add this one
      const next = [...selected, id]
      onChange(next.length === options.length ? [] : next)
    }
  }

  const label = allSelected
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.name ?? '1 ausgewählt'
      : `${selected.length} ausgewählt`

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between border border-[#e5dfd5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2c2316] font-light">
        <span className={!allSelected ? 'text-[#1e1813]' : 'text-[#b5a99a]'}>{label}</span>
        <div className="flex items-center gap-1">
          {!allSelected && (
            <span onClick={e => { e.stopPropagation(); onChange([]) }}
              className="text-[#b5a99a] hover:text-[#1e1813]"><X size={12} /></span>
          )}
          <ChevronDown size={14} className={`text-[#b5a99a] transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-[#e5dfd5] rounded-xl shadow-lg overflow-hidden">
          {options.length > 5 && (
            <div className="px-3 pt-2.5 pb-1.5 border-b border-[#f5f0ea]">
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..." className="w-full text-sm text-[#1e1813] focus:outline-none font-light placeholder-[#b5a99a]" />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {/* Alle */}
            <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#faf8f5] cursor-pointer" onClick={() => onChange([])}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${allSelected ? 'bg-[#2c2316] border-[#2c2316]' : 'border-[#e5dfd5]'}`}>
                {allSelected && <Check size={10} className="text-white" />}
              </div>
              <span className="text-sm text-[#1e1813] font-light">Alle</span>
            </div>
            <div className="border-t border-[#f5f0ea] my-0.5" />
            {filtered.map(o => {
              const checked = allSelected || selected.includes(o.id)
              return (
                <div key={o.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#faf8f5] cursor-pointer" onClick={() => handleItemClick(o.id)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-[#2c2316] border-[#2c2316]' : 'border-[#e5dfd5]'}`}>
                    {checked && <Check size={10} className="text-white" />}
                  </div>
                  {o.color ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: o.color, color: o.textColor ?? '#1e1813' }}>{o.name}</span>
                  ) : (
                    <span className="text-sm text-[#1e1813] font-light">{o.name}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export Content ───────────────────────────────────────────────────────────

function ExportContent({ profile }: { profile: Profile }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterCompanies, setFilterCompanies] = useState<string[]>([])
  const [filterProjects, setFilterProjects] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState(startOfMonthISO())
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [preview, setPreview] = useState<TimeEntry[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'companies')).then(snap => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name)))
    })
    getDocs(collection(db, 'projects')).then(snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
        .filter(p => p.is_active && !p.is_completed).sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => { loadPreview() }, [filterCompanies, filterProjects, dateFrom, dateTo])

  // When company selection changes, remove project selections that don't belong to selected companies
  useEffect(() => {
    if (filterCompanies.length === 0) return
    const validProjects = visibleProjects.map(p => p.id)
    setFilterProjects(prev => prev.filter(id => validProjects.includes(id)))
  }, [filterCompanies])

  const visibleProjects = filterCompanies.length === 0
    ? projects
    : projects.filter(p => filterCompanies.includes(p.company_id))

  async function fetchEntries(): Promise<TimeEntry[]> {
    const uid = auth.currentUser?.uid
    const snap = await getDocs(
      profile.role !== 'admin' && uid
        ? query(collection(db, 'time_entries'), where('user_id', '==', uid))
        : collection(db, 'time_entries')
    )
    const compMap = new Map(companies.map(c => [c.id, c]))
    const projMap = new Map(projects.map(p => [p.id, p]))
    return snap.docs
      .map(d => {
        const data = d.data()
        return { id: d.id, ...data, company: compMap.get(data.company_id), project: projMap.get(data.project_id) } as TimeEntry
      })
      .filter(e => e.date >= dateFrom && e.date <= dateTo)
      .filter(e => filterCompanies.length === 0 || (e.company_id != null && filterCompanies.includes(e.company_id)))
      .filter(e => filterProjects.length === 0 || (e.project_id != null && filterProjects.includes(e.project_id)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async function loadPreview() {
    setLoadingPreview(true)
    const all = await fetchEntries()
    setPreview(all.slice(0, 10))
    setLoadingPreview(false)
  }

  function filterLabel() {
    const c = filterCompanies.length === 0 ? 'Alle Firmen' : filterCompanies.length === 1 ? companies.find(x => x.id === filterCompanies[0])?.name ?? 'Firma' : `${filterCompanies.length} Firmen`
    const p = filterProjects.length === 0 ? '' : filterProjects.length === 1 ? projects.find(x => x.id === filterProjects[0])?.name ?? 'Projekt' : `${filterProjects.length} Projekte`
    return p ? `${c} · ${p}` : c
  }

  async function handleExcelExport() {
    setExporting('excel')
    const entries = await fetchEntries()
    const rows = entries.map(e => ({
      Datum: e.date,
      Firma: e.company?.name ?? '',
      Projekt: (e.project as {name?: string})?.name ?? '',
      Überschrift: e.description ?? '',
      Beschreibung: e.notes ?? '',
      'Dauer (Min)': e.duration_minutes,
      Dauer: formatDuration(e.duration_minutes),
      Mitarbeiter: e.staff_code,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Zeiterfassung')
    XLSX.writeFile(wb, `zeiterfassung_${dateFrom}_${dateTo}.xlsx`)
    setExporting(null)
  }

  async function handlePDFExport() {
    setExporting('pdf')
    const entries = await fetchEntries()
    const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)
    const origin = window.location.origin

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>
@font-face { font-family:'Dazzle Unicase'; src:url('${origin}/fonts/dazzle-unicase-light.otf') format('opentype'); font-weight:300; }
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400&display=swap');
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:'DM Sans',Arial,sans-serif;font-weight:300;color:#1e1813;background:#faf8f5; }
.hero { background:#2c2316;padding:36px 48px 32px;text-align:center; }
.hero img { height:22px;margin:0 auto 20px;display:block;opacity:0.85; }
.hero-title { font-family:'Dazzle Unicase',serif;font-weight:300;font-size:32px;color:white;letter-spacing:0.06em; }
.hero-sub { font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px;font-weight:300; }
.hero-meta { margin-top:16px;font-size:12px;color:rgba(255,255,255,0.6); }
.hero-meta strong { color:white;display:inline;font-size:13px;font-weight:400; }
.content { padding:32px 48px; }
.summary { display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px; }
.card { background:white;border-radius:10px;padding:16px 20px;border:1px solid #e5dfd5; }
.card .label { font-size:10px;color:#8a7f72;text-transform:uppercase;letter-spacing:0.8px;font-weight:400; }
.card .value { font-family:'Dazzle Unicase',serif;font-size:24px;font-weight:300;margin-top:6px;color:#1e1813;letter-spacing:0.04em; }
table { width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;border:1px solid #e5dfd5; }
thead tr { background:#2c2316; }
th { padding:11px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:white;font-weight:400; }
tbody tr:nth-child(even) { background:#faf8f5; }
td { padding:10px 14px;border-bottom:1px solid #f0ebe3;vertical-align:top; }
.badge { display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:400; }
.desc-title { font-size:12px;color:#1e1813;font-weight:400; }
.desc-notes { font-size:11px;color:#8a7f72;margin-top:3px;font-weight:300;line-height:1.5; }
.dur { font-family:'Dazzle Unicase',serif;font-weight:300;font-size:13px;color:#1e1813;white-space:nowrap; }
.footer { margin-top:24px;text-align:center;font-size:10px;color:#b5a99a;padding-bottom:16px; }
@media print { body{background:white} .hero{-webkit-print-color-adjust:exact;print-color-adjust:exact} thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
</style></head><body>
<div class="hero">
  <img src="${origin}/logo-mohona-white.svg" alt="MOHONA" />
  <div class="hero-title">Zeiterfassung</div>
  <div class="hero-sub">${dateFrom} – ${dateTo}</div>
  <div class="hero-meta">
    <strong>${filterLabel()}</strong>
    &nbsp;· Erstellt am ${new Date().toLocaleDateString('de-AT', { day:'2-digit', month:'long', year:'numeric' })}
  </div>
</div>
<div class="content">
  <div class="summary">
    <div class="card"><div class="label">Gesamtstunden</div><div class="value">${formatDuration(totalMinutes)}</div></div>
    <div class="card"><div class="label">Einträge</div><div class="value">${entries.length}</div></div>
    <div class="card"><div class="label">Firma</div><div class="value" style="font-size:14px;margin-top:8px">${filterCompanies.length === 0 ? 'Alle' : filterCompanies.length === 1 ? companies.find(c => c.id === filterCompanies[0])?.name ?? '' : `${filterCompanies.length} Firmen`}</div></div>
    <div class="card"><div class="label">Zeitraum</div><div class="value" style="font-size:13px;margin-top:8px">${dateFrom}<br>${dateTo}</div></div>
  </div>
  <table>
    <thead><tr><th>Datum</th><th>Firma</th><th>Tätigkeit</th><th>Projekt</th><th>Dauer</th><th>Mitarbeiter</th></tr></thead>
    <tbody>
    ${entries.map(e => `<tr>
      <td style="font-size:11px;color:#8a7f72;white-space:nowrap">${e.date}</td>
      <td><span class="badge" style="background:${e.company?.color ?? '#e5dfd5'};color:${e.company?.text_color ?? '#1e1813'}">${e.company?.name ?? '–'}</span></td>
      <td>
        <div class="desc-title">${e.description ?? ''}</div>
        ${e.notes ? `<div class="desc-notes">${e.notes}</div>` : ''}
      </td>
      <td style="font-size:11px;color:#8a7f72">${(e.project as {name?: string})?.name ?? '–'}</td>
      <td><span class="dur">${formatDuration(e.duration_minutes)}</span></td>
      <td style="font-size:11px;color:#8a7f72">${e.staff_code}</td>
    </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">MOHONA Zeiterfassung &middot; ${new Date().getFullYear()}</div>
</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.onload = () => setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 800)
    setExporting(null)
  }

  const totalMinutes = preview.reduce((s, e) => s + e.duration_minutes, 0)
  const inputClass = "w-full border border-[#e5dfd5] rounded-lg px-3 py-2.5 text-sm text-[#1e1813] focus:outline-none focus:ring-2 focus:ring-[#2c2316] bg-white font-light"

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navbar profile={profile} />
      <main className="pt-14 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 pt-4">
            <h1 className="text-4xl text-[#1e1813]" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontWeight: 300 }}>
              Export
            </h1>
            <p className="text-sm text-[#8a7f72] mt-1 font-light">Exportiere deine Einträge als Excel oder PDF.</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e5dfd5] p-5 mb-6">
            <h3 className="text-sm font-medium text-[#1e1813] mb-4 uppercase tracking-wider" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontSize: '16px', fontWeight: 400 }}>Filter</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma</label>
                <MultiSelectDropdown
                  options={companies.map(c => ({ id: c.id, name: c.name, color: c.color, textColor: c.text_color }))}
                  selected={filterCompanies}
                  onChange={setFilterCompanies}
                  placeholder="Alle Firmen"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Projekt</label>
                <MultiSelectDropdown
                  options={visibleProjects.map(p => ({ id: p.id, name: p.name }))}
                  selected={filterProjects}
                  onChange={setFilterProjects}
                  placeholder="Alle Projekte"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Von</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Bis</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { type: 'excel' as const, label: 'Excel Export', desc: 'Als .xlsx Datei herunterladen', icon: FileSpreadsheet, handler: handleExcelExport },
              { type: 'pdf' as const, label: 'PDF Export', desc: 'Druckbarer Bericht', icon: FileText, handler: handlePDFExport },
            ].map(({ type, label, desc, icon: Icon, handler }) => (
              <button key={type} onClick={handler} disabled={exporting !== null}
                className="bg-white hover:bg-[#faf8f5] border border-[#e5dfd5] hover:border-[#2c2316] rounded-xl p-5 text-left transition-all group disabled:opacity-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#f0ebe3] group-hover:bg-[#2c2316] rounded-xl flex items-center justify-center transition-colors">
                    <Icon size={18} className="text-[#2c2316] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#1e1813]">{label}</p>
                    <p className="text-xs text-[#8a7f72] font-light">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#8a7f72] group-hover:text-[#2c2316]">
                  <Download size={12} />
                  {exporting === type ? 'Exportiere...' : type === 'excel' ? 'Als .xlsx herunterladen' : 'Als PDF herunterladen'}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#e5dfd5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5dfd5] flex items-center justify-between">
              <h3 className="text-sm font-medium text-[#1e1813]">Vorschau <span className="text-[#b5a99a] font-light">(letzte 10 Einträge)</span></h3>
              <span className="text-xs text-[#8a7f72] font-light">{formatDuration(totalMinutes)} in diesem Zeitraum</span>
            </div>
            {loadingPreview ? (
              <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#2c2316] border-t-transparent rounded-full animate-spin" /></div>
            ) : preview.length === 0 ? (
              <p className="text-center text-sm text-[#b5a99a] py-8 font-light">Keine Einträge in diesem Zeitraum</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5dfd5] bg-[#faf8f5]">
                    {['Datum', 'Firma', 'Beschreibung', 'Dauer'].map(h => (
                      <th key={h} className="text-left text-xs text-[#8a7f72] px-4 py-3 uppercase tracking-wide font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f0ea]">
                  {preview.map(entry => (
                    <tr key={entry.id} className="hover:bg-[#faf8f5]">
                      <td className="px-4 py-3 text-xs text-[#8a7f72] font-light">{entry.date}</td>
                      <td className="px-4 py-3">
                        {entry.company && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: entry.company.color, color: entry.company.text_color }}>{entry.company.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1e1813] max-w-xs truncate font-light">{entry.description}</td>
                      <td className="px-4 py-3 text-xs font-medium text-[#1e1813]">{formatDuration(entry.duration_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
