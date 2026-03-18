# MOHONA Zeiterfassung – Projektdokumentation

## Überblick
KI-gestütztes Zeiterfassungstool für das MOHONA-Team. Mitarbeiter erfassen Stunden via natürlicher Sprache (Claude AI), Admins verwalten Firmen/Projekte und exportieren Berichte.

---

## Tech Stack

| Bereich | Technologie |
|--------|-------------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | TailwindCSS v4 (utility-first, kein Komponenten-Framework) |
| Datenbank | Firebase Firestore |
| Auth | Firebase Authentication (Email/Passwort) |
| KI | Anthropic Claude Haiku (`claude-haiku-4-5`) |
| Charts | Recharts |
| Excel | XLSX |
| Datum | date-fns |
| Icons | Lucide React |

---

## Projektstruktur

```
app/
  api/
    ki-eingabe/route.ts     # KI: Einzeleintrag aus Text extrahieren
    ki-bulk/route.ts        # KI: Mehrere Einträge aus Text/Bild/PDF/Excel
  admin/
    page.tsx                # Admin-Dashboard
    firmen/page.tsx         # Firmenverwaltung
    projekte/page.tsx       # Projektverwaltung
    berichte/page.tsx       # Berichte & Statistiken
  dashboard/page.tsx        # Hauptseite (Hero + Stats)
  eintraege/page.tsx        # Alle Einträge (Admin: alle, User: eigene)
  export/page.tsx           # Export als Excel / PDF
  neu/page.tsx              # Neuer Zeiteintrag
  login/page.tsx            # Login
  page.tsx                  # Root-Redirect

components/
  AuthGuard.tsx             # Auth-Schutz + Ersteinrichtung (Name eingeben)
  AdminGuard.tsx            # Admin-Zugriffsschutz
  Navbar.tsx                # Navigation
  TimeEntryForm.tsx         # Einzeleintrag (KI + manuell)
  BulkEntryModal.tsx        # Bulk-Eingabe mit Datei-Upload
  EntryList.tsx             # Eintrags-Tabelle mit Filter
  DashboardStats.tsx        # KPIs + Charts
  EditEntryModal.tsx        # Eintrag bearbeiten
  CompanySelect.tsx         # Durchsuchbares Firmen-Dropdown
  CompanyBadge.tsx          # Farb-Badge für Firmen
  DateNavigator.tsx         # Datumsauswahl (Monat/Tag/Gesamt)

lib/
  firebase.ts               # Firebase-Initialisierung (Credentials hardcoded)
  types.ts                  # TypeScript Interfaces
  utils.ts                  # Hilfsfunktionen
  config.ts                 # Dauer-Presets
```

---

## Firestore Datenmodell

### `profiles`
```typescript
{
  id: string           // = Firebase Auth UID
  user_id: string      // = Firebase Auth UID
  staff_name: string
  staff_code: string   // Kürzel z.B. "JS" für "John Smith"
  role: 'user' | 'admin'
  is_active: boolean
  created_at: string
}
```

### `companies`
```typescript
{
  id: string
  name: string
  color: string        // Hex, Badge-Hintergrund
  text_color: string   // Hex, Badge-Text
  is_active: boolean
  created_at: string
}
```

### `projects`
```typescript
{
  id: string
  name: string
  company_id: string
  planned_hours?: number | null
  is_active: boolean
  is_completed?: boolean
  created_at: string
}
```

### `time_entries`
```typescript
{
  id: string
  user_id: string
  staff_code: string       // denormalisiert
  company_id: string | null
  project_id: string | null
  description: string      // Überschrift (max ~60 Zeichen)
  notes: string | null     // Detailbeschreibung
  duration_minutes: number
  date: string             // YYYY-MM-DD
  created_at: string
  updated_at: string
}
```

---

## Authentication & Rollen

**Flow:**
1. Login unter `/login` (Email + Passwort)
2. `AuthGuard` prüft Auth-Status bei jeder Seite
3. Kein Profil → Ersteinrichtungsformular (Name eingeben, `staff_code` wird generiert)
4. Root `/` leitet zu `/dashboard` weiter

**Rollen:**
- `user` → eigene Einträge erstellen/sehen, Export
- `admin` → alle Einträge, Firmen/Projekte verwalten, Berichte, alle User-Einträge editieren

**Staff Code Generierung:**
```typescript
generateStaffCode("John Smith") → "JS"
generateStaffCode("Anna") → "ANN"
```

---

## KI-Integration (Anthropic Claude)

**Modell:** `claude-haiku-4-5` (schnell + günstig, unterstützt Vision & Dokumente)
**API Key:** `ANTHROPIC_API_KEY` in `.env.local`

### Einzeleintrag (`/api/ki-eingabe`)
- Input: Freitext z.B. "Newsletter für Kunde A, 2 Stunden"
- Output: `{ description, notes, company_id, duration_minutes, confidence }`
- Max tokens: 400
- Confidence 0–1 (>0.7 grün, >0.4 orange, <0.4 rot)

### Bulk-Eingabe (`/api/ki-bulk`)
- Input: Text, Bild (JPEG/PNG/GIF/WebP), PDF, Excel
- Output: Array von Einträgen zur Überprüfung vor dem Speichern
- Max tokens: 2000
- Excel wird client-seitig geparst und als CSV-Text gesendet

**Verhalten:**
- Erkennt "heute", "gestern" → korrekte Datumsauflösung
- Validiert Firma/Projekt gegen aktive Einträge
- Standard-Dauer: 60 Minuten wenn unklar
- Beschreibung max ~60 Zeichen

---

## Design-System

### Farben (MOHONA Branding)
```
Primary:          #2c2316  (dunkelbraun)
Background:       #faf8f5  (creme)
Border:           #e5dfd5  (helles beige)
Text Primary:     #1e1813  (sehr dunkel)
Text Secondary:   #8a7f72  (mittelgrau)
Text Tertiary:    #b5a99a  (hellgrau)
```

### Typografie
- **Headings/Branding:** "Dazzle Unicase" Light 300 (OTF in `/public/fonts`)
- **Body:** System-Font, light weight

### Wiederkehrende Klassen
```
Input:      border border-[#e5dfd5] focus:ring-2 focus:ring-[#2c2316] px-4 py-3
Button:     bg-[#2c2316] hover:bg-[#3d3220] text-white
Secondary:  border border-[#e5dfd5] text-[#8a7f72]
Card:       bg-white rounded-xl border border-[#e5dfd5]
Row hover:  hover:bg-[#faf8f5]
Modal:      fixed inset-0 bg-black/30 + bg-white rounded-xl
```

---

## Export

### Excel (.xlsx)
- Spalten: Datum, Firma, Projekt, Überschrift, Beschreibung, Dauer (Min), Dauer (formatiert), Mitarbeiter
- Dateiname: `zeiterfassung_YYYY-MM-DD_YYYY-MM-DD.xlsx`

### PDF
- HTML+CSS → Print-Dialog in neuem Fenster
- Hero-Header mit Logo, Zusammenfassungskarten, gestylte Tabelle
- Dazzle Font via `@font-face` eingebettet
- Firmen-Badges farbig, druckoptimiert

---

## Dauer-Presets
`15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480` Minuten

---

## Dashboard Features
- **Motivationszitat:** Deterministisch basierend auf Tag des Jahres (kein API-Call)
- **Spotlight-Effekt:** Mouse-tracking auf Hero-Header
- **DateNavigator:** Monat / Tag / Gesamt
- **Stats:** Stunden heute, Stunden gesamt, Anzahl Einträge, Firma-Chart

---

## Firestore Security Rules
- `profiles`: Jeder Auth-User kann lesen; User erstellt eigenes, Admin kann updaten
- `companies` & `projects`: Auth-User read-only; nur Admin write
- `time_entries`: User sieht/editiert eigene; Admin sieht alle; User kann erstellen

---

## Environment Variables (`.env.local`)
```bash
ANTHROPIC_API_KEY=sk-ant-...

# Legacy (nicht aktiv genutzt)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Firebase-Credentials sind direkt in `lib/firebase.ts` hardcoded (kein Env-Var).

---

## Lokale Entwicklung
```bash
npm run dev    # Dev-Server auf localhost:3000
npm run build  # Production Build
npm start      # Production Server
```

---

## Wichtige Konventionen
- Alle Custom-Farben als Hex in `className` (kein Tailwind-Theme-Config)
- `'use client'` Direktive bei allen interaktiven Komponenten
- Datum-Storage immer als `YYYY-MM-DD` String
- Datum-Display auf Deutsch (de-DE Locale)
- Firestore-Queries client-seitig (kein Server-Side Fetch außer in API-Routes)
- Keine separaten State-Management-Libs (nur React useState/useEffect)
