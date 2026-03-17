-- MOHONA Zeiterfassung – Supabase Schema
-- Run this in the Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name  TEXT NOT NULL,
  staff_code  TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- 2. Companies table (dynamic, managed via admin panel)
CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#116dff',
  text_color  TEXT NOT NULL DEFAULT '#ffffff',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);

-- 4. Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_code        TEXT NOT NULL,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  description       TEXT NOT NULL,
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
  date              DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx ON time_entries(date);
CREATE INDEX IF NOT EXISTS time_entries_company_id_idx ON time_entries(company_id);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Companies policies (everyone reads, only admins write)
CREATE POLICY "companies_select_all" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert_admin" ON companies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "companies_delete_admin" ON companies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Projects policies (same as companies)
CREATE POLICY "projects_select_all" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_admin" ON projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "projects_update_admin" ON projects FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "projects_delete_admin" ON projects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Time entries policies (users see own, admins see all)
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "time_entries_insert_own" ON time_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "time_entries_update_own" ON time_entries FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "time_entries_delete_own" ON time_entries FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 7. Seed: Demo companies (optional, can be managed via admin panel)
INSERT INTO companies (name, color, text_color) VALUES
  ('MOHONA', '#116dff', '#ffffff'),
  ('Kunde A',  '#16a34a', '#ffffff'),
  ('Kunde B',  '#d97706', '#ffffff')
ON CONFLICT DO NOTHING;
