-- Demo machines (jantes sur mesure)
INSERT INTO machines (nom, statut, heures_ouverture, competences_requises) VALUES
  ('Tour CNC 01',    'Actif',       '2x8',     ARRAY['tournage', 'cnc']),
  ('Tour CNC 02',    'Actif',       '2x8',     ARRAY['tournage', 'cnc']),
  ('Fraiseuse 01',   'Actif',       'Journée', ARRAY['fraisage']),
  ('Rectifieuse 01', 'Maintenance', '2x8',     ARRAY['rectification']),
  ('Polisseuse 01',  'Actif',       'Journée', ARRAY['polissage']);

-- Demo clients
INSERT INTO clients (nom, priorite_rang, is_premium) VALUES
  ('Constructeur A',  1, true),
  ('Constructeur B',  2, true),
  ('Distributeur X',  3, false),
  ('Garage Martin',   4, false),
  ('SAV Interne',     5, false);

-- Demo OFs (à planifier)
INSERT INTO ordres_fabrication (client_nom, reference_of, gamme, sla_date, priorite, temps_estime_minutes, statut) VALUES
  ('Constructeur A', 'OF-2024-001', 'Jante Sport 18p', CURRENT_DATE + 5, 'Constructeur', 180, 'A_planifier'),
  ('Constructeur B', 'OF-2024-002', 'Jante Classic 16p', CURRENT_DATE + 3, 'Constructeur', 120, 'A_planifier'),
  ('Distributeur X', 'OF-2024-003', 'Jante Utilitaire 15p', CURRENT_DATE + 7, 'Standard', 90, 'A_planifier'),
  ('Garage Martin',  'OF-2024-004', 'Jante Custom 17p', CURRENT_DATE + 10, 'Standard', 240, 'A_planifier'),
  ('SAV Interne',    'OF-2024-005', 'Réparation jante fissurée', CURRENT_DATE + 1, 'Urgence', 60, 'A_planifier');
