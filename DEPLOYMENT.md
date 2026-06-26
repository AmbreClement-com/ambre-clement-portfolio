# Déploiement — Préproduction

Runbook de mise en préproduction du portfolio **Ambre Clément** (Next.js 16 / Drizzle / Auth.js v5 / Cloudflare R2).

## Architecture retenue (services gratuits)

| Couche | Service | Pourquoi |
|---|---|---|
| **App (front + API)** | **Vercel** (Hobby, gratuit) | Hôte natif de Next.js App Router. Build & déploiement continus depuis GitHub. Fonctions serverless pour les routes API (`/api/*`, Auth.js). `serverExternalPackages: ["sharp", "@electric-sql/pglite"]` déjà configuré. |
| **Base de données** | **Neon** (Postgres serverless, gratuit) | Postgres managé, driver HTTP **déjà câblé** (`@neondatabase/serverless` + `drizzle-orm/neon-http`). Compatible serverless (pas de pool de connexions à gérer). Le code bascule automatiquement Neon ↔ PGlite selon `DATABASE_URL`. |
| **Stockage images** | **Cloudflare R2** (gratuit : 10 Go, 0 frais d'egress) | S3-compatible, **déjà câblé** (`src/server/images/storage.ts`). Le pipeline d'upload (AVIF/WebP responsive) y pousse les dérivés. |
| **Auth** | **Auth.js v5** (sur Vercel) | Provider Credentials + argon2, sessions JWT. Nécessite `AUTH_SECRET`. |

> En local, aucun de ces services n'est requis : sans `DATABASE_URL`, l'app tourne sur **PGlite** (Postgres WASM sur disque, `.pglite/`).

---

## Variables d'environnement (à définir dans Vercel)

| Variable | Rôle | Exemple / source |
|---|---|---|
| `DATABASE_URL` | Connexion Neon (chaîne **pooled**) | `postgresql://user:pwd@ep-xxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require` |
| `AUTH_SECRET` | Clé de signature des sessions Auth.js | Générer : `openssl rand -base64 32` |
| `R2_ACCOUNT_ID` | Compte Cloudflare R2 | Dashboard Cloudflare → R2 |
| `R2_ACCESS_KEY_ID` | Clé d'accès R2 (token S3) | Cloudflare → R2 → Manage API Tokens |
| `R2_SECRET_ACCESS_KEY` | Secret R2 | idem |
| `R2_BUCKET` | Nom du bucket | `ambre-clement-media` |
| `R2_PUBLIC_URL` | URL publique du bucket (CDN) | `https://media.exemple.com` ou l'URL `r2.dev` du bucket |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site | `https://<projet>.vercel.app` (préprod) |

Définir `DATABASE_URL` et `AUTH_SECRET` pour les 3 environnements Vercel (Production, Preview, Development) — le **build** en a besoin (migrations + prerendering).

---

## Procédure (une fois les comptes créés)

### 1. GitHub
```bash
# Dépôt local déjà commité (branche main). Créer le dépôt distant puis :
git remote add origin git@github.com:<compte>/ambre-clement.git
git push -u origin main
```

### 2. Neon (base vierge)
1. Créer un projet Neon (région UE recommandée, ex. `eu-central-1`).
2. Copier la chaîne **pooled** → ce sera `DATABASE_URL`.

### 3. Cloudflare R2
1. Créer un bucket (ex. `ambre-clement-media`).
2. Activer l'accès public (domaine `r2.dev` ou domaine custom) → `R2_PUBLIC_URL`.
3. Créer un token API S3 → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ACCOUNT_ID`.

### 4. Vercel
1. **Import** du dépôt GitHub (framework détecté : Next.js).
2. Renseigner **toutes** les variables d'environnement ci-dessus.
3. Déployer. Le **build exécute automatiquement les migrations** : `vercel.json` définit
   `buildCommand: "npm run db:migrate && npm run build"` (migrations idempotentes via le journal Drizzle).

### 5. Seed — créer l'unique administrateur (une fois)
Depuis une machine avec le `DATABASE_URL` Neon dans un `.env` local :
```bash
ADMIN_EMAIL=admin@preprod.local ADMIN_PASSWORD='ChangeMe123!' npm run seed
```
Crée l'admin + les 3 onglets par défaut (Portfolio / Maternité / Projets) + les réglages.
Ré-exécutable sans risque (insertions idempotentes ; n'écrase pas un admin existant).

---

## Identifiants administrateur (préprod)

- **Email** : `admin@preprod.local`
- **Mot de passe** : `ChangeMe123!`
- Connexion : `https://<projet>.vercel.app/admin/login`

### ⚠️ À changer AVANT la production
1. **Mot de passe** : se connecter → **Admin → Réglages → Compte** (action `changePassword`), ou re-seeder avec un `ADMIN_PASSWORD` fort.
2. **Email** : idem via le profil, ou re-seed avec un nouvel `ADMIN_EMAIL`.
3. **`AUTH_SECRET`** : en générer un neuf pour la prod (ne pas réutiliser celui de la préprod).
4. **`NEXT_PUBLIC_SITE_URL`** : passer sur le domaine de production.
5. Mots de passe / tokens : aucun secret n'est commité (`.gitignore` couvre `.env*`).

---

## Vérifications post-déploiement
- [ ] Build Vercel vert (migrations incluses).
- [ ] `https://<projet>.vercel.app/` répond (200).
- [ ] `/admin` redirige vers `/admin/login` quand on n'est pas connecté.
- [ ] Connexion admin OK avec les identifiants préprod.
- [ ] Upload d'une photo → variantes visibles (R2 + barre de progression).

## Notes techniques
- **Région** : `vercel.json` fixe `cdg1` (Paris) pour rapprocher les fonctions de Neon UE.
- **`maxDuration`** : 60 s/route d'upload (1 photo/requête → confortable).
- **Avertissement sharp/libvips** au build local (macOS) : duplication de dylib, sans impact sur Linux/Vercel.
