# Déploiement

Portfolio **Ambre Clément** (Next.js 16 / Drizzle / Auth.js v5). Toute l'infra vit sur
les comptes de la cliente : GitHub (`AmbreClement-com`), Vercel, Neon, Cloudflare (R2 + DNS).

## Architecture

| Couche | Service | Notes |
|---|---|---|
| App (front + API) | **Vercel** (Hobby) | Auto-deploy depuis GitHub. `vercel.json` : `buildCommand: "npm run db:migrate && npm run build"` (migrations idempotentes), fonctions en `cdg1`. |
| Base de données | **Neon** (Postgres serverless) | Driver HTTP (`drizzle-orm/neon-http`) si l'URL contient `neon.tech`, sinon node-postgres (portabilité VPS/RDS…). |
| Stockage images | **Cloudflare R2** | Via variables génériques `S3_*` (`src/server/images/storage.ts`) — n'importe quel stockage S3-compatible convient. Buckets en juridiction UE → endpoint `.eu.`. |
| Auth | **Auth.js v5** | Credentials + argon2, sessions JWT (`AUTH_SECRET`). |
| Sauvegardes | **GitHub Actions** | `.github/workflows/backup.yml` : dump chiffré quotidien + synchro média hebdo → bucket `ac-backups`. |

## Environnements

| Env | Base (Neon client) | Bucket R2 | Déclencheur |
|---|---|---|---|
| dev local | branche `dev` (URL directe) | `ac-media-dev` (public via r2.dev) | `npm run dev` |
| préprod | branche `preprod` (pooled) | `ac-media-dev` | **push sur `preprod`** → Vercel Preview (URL stable `…-git-preprod-….vercel.app`) |
| production | `main` (pooled) | `ac-media` (public via `media.<domaine>`) | **push sur `main`** → Vercel Production |

⚠️ Tout push sur `main` déploie la production : n'y pousser que du code validé en préprod.

## Variables d'environnement

Mêmes clés partout, valeurs par environnement (voir `.env.example`) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Neon — pooled sur Vercel, directe en local |
| `AUTH_SECRET` | Signature des sessions (un secret DIFFÉRENT par environnement) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Accès R2 (token scopé au bucket de l'env) |
| `S3_BUCKET` / `S3_PUBLIC_URL` | Bucket + base publique de lecture (sans slash final) |
| `NEXT_PUBLIC_SITE_URL` | URL canonique du site |

Sur Vercel : Settings → Environment Variables, en veillant à la portée (Production vs Preview).

## Après un déploiement

- [ ] Build vert (migrations incluses)
- [ ] `/` répond 200 ; `/admin` redirige vers `/admin/login`
- [ ] Connexion admin OK ; upload d'une photo test → variantes visibles, puis suppression

## Notes techniques

- Redéploiement sans nouveau commit : Vercel ignore un push dont le SHA est déjà déployé →
  pousser un commit vide (`git commit --allow-empty`).
- Les scripts CLI (`db:migrate`, `seed`, …) chargent `.env.local` puis `.env` ;
  une variable déjà présente dans l'environnement garde la priorité.
- Avertissement sharp/libvips au build local (macOS) : sans impact sur Linux/Vercel.
- Sauvegardes : passphrase de déchiffrement dans le gestionnaire de mots de passe
  (secret GitHub `BACKUP_PASSPHRASE`) ; restauration documentée dans `docs/MIGRATION.md`.
