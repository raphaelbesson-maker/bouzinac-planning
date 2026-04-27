ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE operateurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordres_fabrication ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglements         ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM operateurs WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CLIENTS
CREATE POLICY "clients_read"   ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (get_my_role() = 'Admin');
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (get_my_role() = 'Admin');
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (get_my_role() = 'Admin');

-- MACHINES
CREATE POLICY "machines_read"   ON machines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "machines_insert" ON machines FOR INSERT WITH CHECK (get_my_role() = 'Admin');
CREATE POLICY "machines_update" ON machines FOR UPDATE USING (get_my_role() = 'Admin');
CREATE POLICY "machines_delete" ON machines FOR DELETE USING (get_my_role() = 'Admin');

-- OPERATEURS
CREATE POLICY "operateurs_read"   ON operateurs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "operateurs_insert" ON operateurs FOR INSERT WITH CHECK (get_my_role() = 'Admin');
CREATE POLICY "operateurs_update" ON operateurs FOR UPDATE USING (get_my_role() = 'Admin' OR id = auth.uid());
CREATE POLICY "operateurs_delete" ON operateurs FOR DELETE USING (get_my_role() = 'Admin');

-- ORDRES_FABRICATION
CREATE POLICY "of_read"   ON ordres_fabrication FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "of_insert" ON ordres_fabrication FOR INSERT WITH CHECK (get_my_role() IN ('Admin', 'ADV', 'Atelier'));
CREATE POLICY "of_update" ON ordres_fabrication FOR UPDATE USING (
  get_my_role() IN ('Admin', 'Atelier')
  OR (get_my_role() = 'ADV' AND priorite = 'Urgence')
);
CREATE POLICY "of_delete" ON ordres_fabrication FOR DELETE USING (get_my_role() = 'Admin');

-- PLANNING_SLOTS
CREATE POLICY "slots_read"   ON planning_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "slots_insert" ON planning_slots FOR INSERT WITH CHECK (get_my_role() IN ('Admin', 'Atelier'));
CREATE POLICY "slots_update" ON planning_slots FOR UPDATE USING (get_my_role() IN ('Admin', 'Atelier'));
CREATE POLICY "slots_delete" ON planning_slots FOR DELETE USING (get_my_role() IN ('Admin', 'Atelier'));

-- REGLEMENTS
CREATE POLICY "reglements_read"   ON reglements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reglements_update" ON reglements FOR UPDATE USING (get_my_role() = 'Admin');
CREATE POLICY "reglements_insert" ON reglements FOR INSERT WITH CHECK (get_my_role() = 'Admin');
