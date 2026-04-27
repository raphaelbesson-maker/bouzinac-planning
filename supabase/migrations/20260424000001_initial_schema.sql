CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CLIENTS
CREATE TABLE clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom          TEXT NOT NULL,
  priorite_rang INTEGER NOT NULL DEFAULT 99,
  is_premium   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- MACHINES
CREATE TABLE machines (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                  TEXT NOT NULL,
  statut               TEXT NOT NULL CHECK (statut IN ('Actif', 'Maintenance')) DEFAULT 'Actif',
  heures_ouverture     TEXT NOT NULL DEFAULT '2x8',
  competences_requises TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- OPERATEURS (extends auth.users)
CREATE TABLE operateurs (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('Admin', 'ADV', 'Atelier')),
  competences UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ORDRES DE FABRICATION
CREATE TABLE ordres_fabrication (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_nom           TEXT NOT NULL DEFAULT '',
  reference_of         TEXT NOT NULL UNIQUE,
  gamme                TEXT,
  sla_date             DATE NOT NULL,
  priorite             TEXT NOT NULL CHECK (priorite IN ('Standard', 'Urgence', 'Constructeur')) DEFAULT 'Standard',
  temps_estime_minutes INTEGER NOT NULL DEFAULT 60,
  statut               TEXT NOT NULL CHECK (statut IN ('A_planifier', 'Planifie', 'En_cours', 'Termine')) DEFAULT 'A_planifier',
  machine_id           UUID REFERENCES machines(id) ON DELETE SET NULL,
  start_time           TIMESTAMPTZ,
  end_time             TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- PLANNING SLOTS
CREATE TABLE planning_slots (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  of_id      UUID NOT NULL REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  locked     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_machine_overlap EXCLUDE USING gist (
    machine_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
);

-- REGLES / SETTINGS
CREATE TABLE reglements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL,
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO reglements (key, value, label) VALUES
  ('buffer_minutes',       '15',    'Temps tampon entre OFs (minutes)'),
  ('never_delay_premium',  'true',  'Ne jamais décaler un client Premium'),
  ('max_urgence_per_day',  '2',     'Nombre max d''urgences SAV par jour'),
  ('alert_sla_days_ahead', '2',     'Alerter X jours avant dépassement SLA');

-- Auto-update triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_of_updated_at
  BEFORE UPDATE ON ordres_fabrication
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_slot_updated_at
  BEFORE UPDATE ON planning_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
