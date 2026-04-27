-- ============================================================
-- Phase 2 : Gammes & séquençage multi-opérations
-- ============================================================

-- 1. Catégorie machine
ALTER TABLE machines ADD COLUMN IF NOT EXISTS categorie TEXT;

UPDATE machines SET categorie = 'Tournage'      WHERE nom LIKE 'Tour CNC%';
UPDATE machines SET categorie = 'Fraisage'      WHERE nom LIKE 'Fraiseuse%';
UPDATE machines SET categorie = 'Rectification' WHERE nom LIKE 'Rectifieuse%';
UPDATE machines SET categorie = 'Polissage'     WHERE nom LIKE 'Polisseuse%';

-- Nouvelles machines process complet
INSERT INTO machines (nom, statut, heures_ouverture, competences_requises, categorie)
SELECT 'Presse Formage',  'Actif', '2x8',     '{}', 'Formage'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE nom = 'Presse Formage');

INSERT INTO machines (nom, statut, heures_ouverture, competences_requises, categorie)
SELECT 'Poste Soudage',   'Actif', 'Journée', '{}', 'Soudage'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE nom = 'Poste Soudage');

INSERT INTO machines (nom, statut, heures_ouverture, competences_requises, categorie)
SELECT 'Cabine Peinture', 'Actif', 'Journée', '{}', 'Peinture'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE nom = 'Cabine Peinture');

-- 2. Gammes (templates de gamme de fabrication)
CREATE TABLE IF NOT EXISTS gammes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Opérations par gamme (gamme_operations)
CREATE TABLE IF NOT EXISTS gamme_operations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gamme_id          UUID NOT NULL REFERENCES gammes(id) ON DELETE CASCADE,
  ordre             INT  NOT NULL,
  nom               TEXT NOT NULL,
  categorie_machine TEXT NOT NULL,
  duree_minutes     INT  NOT NULL DEFAULT 60,
  UNIQUE(gamme_id, ordre)
);

-- 4. Instances d'opérations par OF (of_operations)
CREATE TABLE IF NOT EXISTS of_operations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  of_id              UUID NOT NULL REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  gamme_operation_id UUID REFERENCES gamme_operations(id) ON DELETE SET NULL,
  ordre              INT  NOT NULL,
  nom                TEXT NOT NULL,
  categorie_machine  TEXT NOT NULL,
  duree_minutes      INT  NOT NULL,
  machine_id         UUID REFERENCES machines(id) ON DELETE SET NULL,
  statut             TEXT NOT NULL DEFAULT 'A_planifier'
                     CHECK (statut IN ('A_planifier','Planifie','En_cours','Termine')),
  start_time         TIMESTAMPTZ,
  end_time           TIMESTAMPTZ,
  locked             BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(of_id, ordre)
);

-- Contrainte anti-chevauchement sur of_operations (même logique que planning_slots)
ALTER TABLE of_operations ADD CONSTRAINT no_op_overlap
  EXCLUDE USING gist (
    machine_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE TRIGGER trg_of_op_updated_at
  BEFORE UPDATE ON of_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Lier ordres_fabrication à une gamme
ALTER TABLE ordres_fabrication ADD COLUMN IF NOT EXISTS gamme_id UUID REFERENCES gammes(id) ON DELETE SET NULL;

-- ============================================================
-- 6. Données de référence
-- ============================================================

INSERT INTO gammes (nom, description) VALUES
  ('Jante Sport',    'Formage → Tournage → Soudage → Peinture'),
  ('Jante Classic',  'Tournage → Polissage → Peinture'),
  ('Jante Custom',   'Formage → Tournage → Polissage → Peinture'),
  ('Réparation SAV', 'Polissage → Peinture')
ON CONFLICT (nom) DO NOTHING;

-- Opérations Jante Sport
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 1, 'Formage',  'Formage',  90  FROM gammes g WHERE g.nom = 'Jante Sport'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 2, 'Tournage', 'Tournage', 60  FROM gammes g WHERE g.nom = 'Jante Sport'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 3, 'Soudage',  'Soudage',  30  FROM gammes g WHERE g.nom = 'Jante Sport'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 4, 'Peinture', 'Peinture', 60  FROM gammes g WHERE g.nom = 'Jante Sport'
ON CONFLICT (gamme_id, ordre) DO NOTHING;

-- Opérations Jante Classic
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 1, 'Tournage', 'Tournage', 90  FROM gammes g WHERE g.nom = 'Jante Classic'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 2, 'Polissage','Polissage', 30 FROM gammes g WHERE g.nom = 'Jante Classic'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 3, 'Peinture', 'Peinture', 45  FROM gammes g WHERE g.nom = 'Jante Classic'
ON CONFLICT (gamme_id, ordre) DO NOTHING;

-- Opérations Jante Custom
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 1, 'Formage',  'Formage',  120 FROM gammes g WHERE g.nom = 'Jante Custom'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 2, 'Tournage', 'Tournage', 90  FROM gammes g WHERE g.nom = 'Jante Custom'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 3, 'Polissage','Polissage', 60 FROM gammes g WHERE g.nom = 'Jante Custom'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 4, 'Peinture', 'Peinture', 90  FROM gammes g WHERE g.nom = 'Jante Custom'
ON CONFLICT (gamme_id, ordre) DO NOTHING;

-- Opérations Réparation SAV
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 1, 'Polissage','Polissage', 30 FROM gammes g WHERE g.nom = 'Réparation SAV'
ON CONFLICT (gamme_id, ordre) DO NOTHING;
INSERT INTO gamme_operations (gamme_id, ordre, nom, categorie_machine, duree_minutes)
SELECT g.id, 2, 'Peinture', 'Peinture', 30  FROM gammes g WHERE g.nom = 'Réparation SAV'
ON CONFLICT (gamme_id, ordre) DO NOTHING;

-- ============================================================
-- 7. Lier les OFs démo aux gammes et créer leurs of_operations
-- ============================================================

UPDATE ordres_fabrication SET gamme_id = (SELECT id FROM gammes WHERE nom = 'Jante Sport')
WHERE reference_of = 'OF-2024-001' AND gamme_id IS NULL;

UPDATE ordres_fabrication SET gamme_id = (SELECT id FROM gammes WHERE nom = 'Jante Classic')
WHERE reference_of = 'OF-2024-002' AND gamme_id IS NULL;

UPDATE ordres_fabrication SET gamme_id = (SELECT id FROM gammes WHERE nom = 'Jante Classic')
WHERE reference_of = 'OF-2024-003' AND gamme_id IS NULL;

UPDATE ordres_fabrication SET gamme_id = (SELECT id FROM gammes WHERE nom = 'Jante Custom')
WHERE reference_of = 'OF-2024-004' AND gamme_id IS NULL;

UPDATE ordres_fabrication SET gamme_id = (SELECT id FROM gammes WHERE nom = 'Réparation SAV')
WHERE reference_of = 'OF-2024-005' AND gamme_id IS NULL;

-- Créer les of_operations pour les OFs liés à une gamme (idempotent)
INSERT INTO of_operations (of_id, gamme_operation_id, ordre, nom, categorie_machine, duree_minutes)
SELECT
  of.id,
  go.id,
  go.ordre,
  go.nom,
  go.categorie_machine,
  go.duree_minutes
FROM ordres_fabrication of
JOIN gammes g ON g.id = of.gamme_id
JOIN gamme_operations go ON go.gamme_id = g.id
WHERE of.gamme_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM of_operations WHERE of_id = of.id);

-- ============================================================
-- 8. RLS pour les nouvelles tables
-- ============================================================

ALTER TABLE gammes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamme_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE of_operations    ENABLE ROW LEVEL SECURITY;

-- gammes : lecture pour tous, écriture Admin seulement
CREATE POLICY "gammes_read"  ON gammes FOR SELECT TO authenticated USING (true);
CREATE POLICY "gammes_write" ON gammes FOR ALL USING (
  (SELECT role FROM operateurs WHERE id = auth.uid()) = 'Admin'
);

-- gamme_operations : même règle
CREATE POLICY "gamme_ops_read"  ON gamme_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "gamme_ops_write" ON gamme_operations FOR ALL USING (
  (SELECT role FROM operateurs WHERE id = auth.uid()) = 'Admin'
);

-- of_operations : lecture pour tous, écriture Atelier + Admin
CREATE POLICY "of_ops_read"  ON of_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "of_ops_write" ON of_operations FOR ALL USING (
  (SELECT role FROM operateurs WHERE id = auth.uid()) IN ('Admin', 'Atelier')
);
