# Ambre Clément — Portfolio photo

Portfolio photographique professionnel + espace d'administration, refonte de l'ancien
site Wix. Pensé pour le SEO (SSR/SSG), la performance (images AVIF/WebP) et la
maintenabilité.

## Stack

| Couche | Techno |
|---|---|
| Framework | Next.js 16 (App Router, RSC, SSG/ISR) · TypeScript |
| UI | Tailwind CSS v4 · Shadcn/UI · Framer Motion |
| Base de données | Neon (Postgres serverless) |
| ORM | Drizzle ORM |
| Auth | Auth.js (NextAuth v5) — credentials, session JWT |
| Stockage images | Cloudflare R2 + CDN · traitement `sharp` (AVIF/WebP) |
| Hébergement | Vercel |

## Démarrage

```bash
npm install
cp .env.example .env.local      # puis renseigner les variables
npm run db:push                 # crée les tables sur Neon
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed   # compte admin + données de base
npm run dev
```

- Site public : http://localhost:3000
- Admin : http://localhost:3000/admin (redirige vers /admin/login)

## Variables d'environnement

Voir [`.env.example`](.env.example) : `DATABASE_URL` (Neon), `AUTH_SECRET`,
les clés `S3_*` (stockage S3-compatible — Cloudflare R2) et `NEXT_PUBLIC_SITE_URL`.

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `start` | Build et serveur de production |
| `npm run db:generate` | Génère une migration SQL depuis le schéma |
| `npm run db:push` | Pousse le schéma vers la base (dev) |
| `npm run db:migrate` | Applique les migrations (prod) |
| `npm run db:studio` | Interface Drizzle Studio |
| `npm run seed` | Crée l'admin + catégories + réglages |

## Arborescence

```
src/
├── app/
│   ├── (public)/        # site public (accueil, projets, contact…)
│   ├── admin/           # espace d'administration (protégé)
│   │   ├── (panel)/     # dashboard + gestion (avec sidebar)
│   │   └── login/       # connexion (sans sidebar)
│   ├── api/auth/        # routes Auth.js
│   ├── sitemap.ts · robots.ts
│   └── layout.tsx
├── components/
│   ├── ui/              # Shadcn
│   ├── public/          # header, footer, galerie, image responsive
│   └── admin/           # formulaires, uploader…
├── server/
│   ├── db/              # schéma Drizzle + requêtes
│   ├── actions/         # Server Actions (CRUD)
│   ├── auth/            # config Auth.js
│   └── images/          # pipeline sharp + client R2
├── lib/                 # seo, validators (zod), utils
└── proxy.ts            # protège /admin (middleware Next 16)
```

## SEO & images

- Métadonnées par page via `buildMetadata()` (`src/lib/seo.ts`) + JSON-LD.
- `sitemap.xml` / `robots.txt` dynamiques.
- Images : upload → `sharp` génère AVIF + WebP multi-largeurs + LQIP → R2/CDN,
  servies via `<ResponsiveImage>` (`<picture>` + srcset, zéro CLS).
- Alt text **obligatoire** (contrainte base + validation Zod).

## Environnements

| Env | Base (Neon client) | Stockage (R2) | Déploiement |
|---|---|---|---|
| dev local | branche `dev` | `ac-media-dev` | `npm run dev` |
| préprod | branche `preprod` | `ac-media-dev` | push sur `preprod` (Vercel Preview) |
| production | `main` | `ac-media` | push sur `main` (Vercel Production) |

Détails dans [DEPLOYMENT.md](DEPLOYMENT.md) ; migration d'infra : [docs/MIGRATION.md](docs/MIGRATION.md).
