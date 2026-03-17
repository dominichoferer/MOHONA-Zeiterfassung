'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Company, Project, TimeEntry, Profile } from '@/lib/types'
import { formatDuration, startOfMonthISO } from '@/lib/utils'
import { Download, FileText, Table } from 'lucide-react'
import CompanySelect from '@/components/CompanySelect'

export default function ExportPage() {
  return (
    <AuthGuard>
      {(profile) => <ExportContent profile={profile} />}
    </AuthGuard>
  )
}

function ExportContent({ profile }: { profile: Profile }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterCompany, setFilterCompany] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [dateFrom, setDateFrom] = useState(startOfMonthISO())
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [preview, setPreview] = useState<TimeEntry[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'companies')).then(snap => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))
        .filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name)))
    })
    getDocs(collection(db, 'projects')).then(snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
        .filter(p => p.is_active).sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  useEffect(() => { loadPreview() }, [filterCompany, filterProject, dateFrom, dateTo])

  // Reset project filter when company changes
  useEffect(() => { setFilterProject('') }, [filterCompany])

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
      .filter(e => !filterCompany || e.company_id === filterCompany)
      .filter(e => !filterProject || e.project_id === filterProject)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async function loadPreview() {
    setLoadingPreview(true)
    const all = await fetchEntries()
    setPreview(all.slice(0, 10))
    setLoadingPreview(false)
  }

  async function handleCSVExport() {
    setExporting('csv')
    const entries = await fetchEntries()
    const headers = ['Datum', 'Firma', 'Projekt', 'Beschreibung', 'Dauer (Min)', 'Dauer', 'Mitarbeiter']
    const rows = entries.map(e => [
      e.date, e.company?.name ?? '', e.project?.name ?? '',
      `"${e.description.replace(/"/g, '""')}"`,
      e.duration_minutes, formatDuration(e.duration_minutes), e.staff_code,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zeiterfassung_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(null)
  }

  async function handlePDFExport() {
    setExporting('pdf')
    const entries = await fetchEntries()
    const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0)
    const companyFilter = filterCompany ? companies.find(c => c.id === filterCompany)?.name ?? '' : 'Alle Firmen'

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;color:#1e1813;background:white;padding:40px; }
.header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #2c2316; }
.logo { font-size:20px;font-weight:700;color:#2c2316;letter-spacing:2px; } .logo span { color:#8a7f72;font-weight:300;font-size:12px;display:block;margin-top:2px; }
.meta { text-align:right;font-size:12px;color:#8a7f72; } .meta strong { color:#1e1813;display:block;margin-bottom:4px; }
.summary { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px; }
.card { background:#faf8f5;border-radius:8px;padding:16px;border:1px solid #e5dfd5; }
.card .label { font-size:11px;color:#8a7f72;text-transform:uppercase;letter-spacing:0.5px; }
.card .value { font-size:22px;font-weight:600;margin-top:4px;color:#1e1813; }
table { width:100%;border-collapse:collapse;font-size:12px; }
thead tr { background:#2c2316;color:white; }
th { padding:10px 12px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px; }
tbody tr:nth-child(even) { background:#faf8f5; }
td { padding:10px 12px;border-bottom:1px solid #f0ebe3; }
.badge { display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500; }
.footer { margin-top:32px;text-align:center;font-size:11px;color:#b5a99a; }
</style></head><body>
<div class="header">
  <div class="logo">MOHONA <span>Zeiterfassung</span></div>
  <div class="meta"><strong>Zeitraum: ${dateFrom} – ${dateTo}</strong>Firma: ${companyFilter}<br>Erstellt: ${new Date().toLocaleDateString('de-AT')}</div>
</div>
<div class="summary">
  <div class="card"><div class="label">Gesamt</div><div class="value">${formatDuration(totalMinutes)}</div></div>
  <div class="card"><div class="label">Einträge</div><div class="value">${entries.length}</div></div>
  <div class="card"><div class="label">Zeitraum</div><div class="value" style="font-size:14px">${dateFrom}<br>${dateTo}</div></div>
</div>
<table>
<thead><tr><th>Datum</th><th>Firma</th><th>Beschreibung</th><th>Dauer</th><th>Mitarbeiter</th></tr></thead>
<tbody>
${entries.map(e => `<tr>
  <td>${e.date}</td>
  <td><span class="badge" style="background:${e.company?.color ?? '#e5dfd5'};color:${e.company?.text_color ?? '#1e1813'}">${e.company?.name ?? '–'}</span></td>
  <td>${e.description}</td>
  <td><strong>${formatDuration(e.duration_minutes)}</strong></td>
  <td>${e.staff_code}</td>
</tr>`).join('')}
</tbody></table>
<div class="footer">MOHONA Zeiterfassung · ${new Date().getFullYear()}</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.onload = () => setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 500)
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
            <p className="text-sm text-[#8a7f72] mt-1 font-light">Exportiere deine Einträge als CSV oder PDF.</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e5dfd5] p-5 mb-6">
            <h3 className="text-sm font-medium text-[#1e1813] mb-4 uppercase tracking-wider" style={{ fontFamily: 'Dazzle Unicase, sans-serif', fontSize: '16px', fontWeight: 400 }}>Filter</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Firma</label>
                <CompanySelect companies={companies} value={filterCompany} onChange={setFilterCompany} placeholder="Alle Firmen" />
              </div>
              <div>
                <label className="block text-xs text-[#8a7f72] mb-1.5 uppercase tracking-wide">Projekt</label>
                <CompanySelect
                  companies={(filterCompany ? projects.filter(p => p.company_id === filterCompany) : projects).map(p => ({ ...p, color: '#e5dfd5', text_color: '#1e1813' }))}
                  value={filterProject}
                  onChange={setFilterProject}
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
              { type: 'csv' as const, label: 'CSV Export', desc: 'Für Excel & Tabellenkalkulation', icon: Table, handler: handleCSVExport },
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
                  {exporting === type ? 'Exportiere...' : `Als ${type.toUpperCase()} herunterladen`}
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
