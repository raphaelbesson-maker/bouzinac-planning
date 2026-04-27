-- ============================================================
-- Migration: ADV Console + Portail Client
-- ============================================================

-- 1. Extend operateurs.role to include 'Client'
ALTER TABLE operateurs DROP CONSTRAINT IF EXISTS operateurs_role_check;
ALTER TABLE operateurs
  ADD CONSTRAINT operateurs_role_check
  CHECK (role IN ('Admin', 'ADV', 'Atelier', 'Client'));

-- 2. Link portal users to a client account
ALTER TABLE operateurs
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Documents table (BL, Factures linked to OFs)
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  of_id        UUID NOT NULL REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('BL', 'Facture', 'Autre')),
  nom_fichier  TEXT NOT NULL,
  storage_path TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 4. Notifications log (to avoid duplicate emails)
CREATE TABLE IF NOT EXISTS notifications_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  of_id           UUID NOT NULL REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS: documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Helper: get the client_id linked to the current portal user
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM operateurs WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Clients can only see documents for their own OFs
-- ADV/Admin/Atelier see all
CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  get_my_role() IN ('Admin', 'ADV', 'Atelier')
  OR (
    get_my_role() = 'Client'
    AND of_id IN (
      SELECT id FROM ordres_fabrication WHERE client_id = get_my_client_id()
    )
  )
);

CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (
  get_my_role() IN ('Admin', 'ADV')
);

CREATE POLICY "documents_delete" ON documents FOR DELETE USING (
  get_my_role() IN ('Admin', 'ADV')
);

-- 6. RLS: notifications_log (internal only)
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_read"   ON notifications_log FOR SELECT USING (get_my_role() IN ('Admin', 'ADV'));
CREATE POLICY "notif_insert" ON notifications_log FOR INSERT WITH CHECK (get_my_role() IN ('Admin', 'ADV', 'Atelier'));

-- 7. Update ordres_fabrication RLS to scope Client role to their own data
DROP POLICY IF EXISTS "of_read" ON ordres_fabrication;
CREATE POLICY "of_read" ON ordres_fabrication FOR SELECT USING (
  get_my_role() IN ('Admin', 'ADV', 'Atelier')
  OR (get_my_role() = 'Client' AND client_id = get_my_client_id())
);

-- 8. Allow Client to insert OFs (self-service command creation — future)
DROP POLICY IF EXISTS "of_insert" ON ordres_fabrication;
CREATE POLICY "of_insert" ON ordres_fabrication FOR INSERT WITH CHECK (
  get_my_role() IN ('Admin', 'ADV', 'Atelier')
);
