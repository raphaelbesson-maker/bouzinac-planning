# Bouzinac Planning — Outil d'ordonnancement

Application d'ordonnancement visuel pour l'atelier Bouzinac (jantes sur mesure, Angers).

## Stack technique

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, Realtime)
- **dnd-kit** (drag & drop tactile)
- **Tailwind CSS + shadcn/ui**
- **Vercel** (hébergement)

## Démarrage local

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
# Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Initialiser la base de données

En local avec la CLI Supabase :

```bash
supabase start
supabase db reset
npm run setup:test-users
```

Cela applique les migrations SQL puis crée les comptes de test dans Supabase Auth via l'API admin locale.

Si vous travaillez sur un projet Supabase distant, exécutez dans le SQL Editor :
1. `supabase/migrations/20260424000001_initial_schema.sql`
2. `supabase/migrations/20260424000002_rls_policies.sql`
3. `supabase/migrations/20260424000003_seed_data.sql`

Puis créez les utilisateurs depuis Supabase Authentication ou via un script d'admin.

Activez ensuite le Realtime sur les tables `planning_slots` et `ordres_fabrication` (Database → Replication).

### 4. Lancer le serveur

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

---

## Structure du projet

```
app/
├── (auth)/login/        ← Connexion
├── planning/            ← Module A : Chef d'Atelier (Gantt + drag & drop)
├── simulateur/          ← Module B : ADV (simulation urgences SAV)
└── admin/               ← Module C : Direction (machines, règles, import)

components/
├── gantt/               ← GanttBoard, GanttRow, GanttBlock
├── sidebar/             ← OFs à planifier
├── simulateur/          ← UrgencePanel, ImpactModal
└── shared/              ← AppShell, StatusBadge

lib/planning/            ← conflict-detector.ts, impact-calculator.ts
stores/planningStore.ts  ← État Zustand optimiste
```

## Comptes de test locaux

Après `npm run setup:test-users`, vous pouvez vous connecter avec :

| Email | Mot de passe | Rôle |
|------|------|------|
| `admin@bouzinac.fr` | `Bouzinac2026!` | `Admin` |
| `adv@bouzinac.fr` | `Bouzinac2026!` | `ADV` |
| `atelier@bouzinac.fr` | `Bouzinac2026!` | `Atelier` |

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `Atelier` | `/planning` |
| `ADV` | `/simulateur` |
| `Admin` | Tous les modules |

Créer un utilisateur : Supabase → Authentication → Invite user, puis :
```sql
INSERT INTO operateurs (id, nom, role) VALUES ('<uuid>', 'Nom', 'Atelier');
```

## Modifier la base de données

1. Créez `supabase/migrations/00X_description.sql`
2. Exécutez dans le SQL Editor Supabase
3. Régénérez les types : `npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts`

## Déploiement Vercel

- Branche `main` → Production
- Branche `staging` → Preview (staging)
- Configurez les variables d'environnement par environnement dans Vercel Settings
