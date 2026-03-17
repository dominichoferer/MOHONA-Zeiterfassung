export type Role = 'user' | 'admin'

export interface Profile {
  id: string          // = Firebase Auth UID
  user_id: string     // = Firebase Auth UID (same)
  staff_name: string
  staff_code: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  color: string
  text_color: string
  is_active: boolean
  created_at: string
}

export interface Project {
  id: string
  name: string
  company_id: string
  planned_hours?: number | null
  is_active: boolean
  created_at: string
  company?: Company
}

export interface TimeEntry {
  id: string
  user_id: string
  staff_code: string
  company_id: string | null
  project_id: string | null
  description: string
  notes: string | null
  duration_minutes: number
  date: string
  created_at: string
  updated_at: string
  // joined client-side
  company?: Company
  project?: Project
  profile?: Profile
}
