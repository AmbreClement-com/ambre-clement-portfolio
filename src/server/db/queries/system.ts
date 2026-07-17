import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/* ------------------------------------------------------------------ */
/* Connexions du site (hébergement, base, stockage) — IDENTIFIANTS      */
/* uniquement, jamais de secrets (mots de passe, clés, jetons).         */
/* ------------------------------------------------------------------ */

export type SiteConnections = {
  hosting: {
    provider: string;
    env: string | null; // production / preview / développement
    url: string | null;
    repo: string | null; // owner/slug GitHub (connu sur Vercel)
    commit: string | null; // sha court du déploiement
  };
  database: {
    provider: string;
    host: string | null;
    name: string | null;
    user: string | null;
    region: string | null;
  };
  storage: {
    provider: string;
    bucket: string | null;
    account: string | null; // id de compte (R2) — tronqué à l'affichage
    publicHost: string | null; // domaine public de diffusion des photos
  };
  site: { url: string | null };
};

/** Décrit les services auxquels le site est connecté (lecture d'env, sans secret). */
export function getSiteConnections(): SiteConnections {
  // Base de données — l'URL contient le mot de passe : on n'en extrait QUE
  // l'hôte, le nom de base et l'utilisateur.
  let database: SiteConnections["database"] = {
    provider: "PostgreSQL",
    host: null,
    name: null,
    user: null,
    region: null,
  };
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    const host = u.hostname;
    database = {
      provider: host.endsWith("neon.tech") ? "Neon — PostgreSQL" : "PostgreSQL",
      host,
      name: u.pathname.replace(/^\//, "") || null,
      user: decodeURIComponent(u.username) || null,
      region: host.match(/\.([a-z]{2}-[a-z]+-\d)\./)?.[1] ?? null,
    };
  } catch {
    /* DATABASE_URL absent ou illisible */
  }

  // Stockage photos (S3 compatible).
  let endpointHost: string | null = null;
  try {
    endpointHost = new URL(process.env.S3_ENDPOINT ?? "").hostname;
  } catch {}
  const isR2 = !!endpointHost?.endsWith("r2.cloudflarestorage.com");
  let publicHost: string | null = null;
  try {
    publicHost = new URL(process.env.S3_PUBLIC_URL ?? "").hostname;
  } catch {
    publicHost = process.env.S3_PUBLIC_URL || null;
  }
  const storage: SiteConnections["storage"] = {
    provider: isR2
      ? "Cloudflare R2"
      : endpointHost?.includes("amazonaws")
        ? "Amazon S3"
        : endpointHost
          ? "Stockage S3"
          : "Non configuré",
    bucket: process.env.S3_BUCKET || null,
    // Id de compte = 1er segment de l'hôte (R2).
    account: isR2 ? (endpointHost?.split(".")[0] ?? null) : null,
    publicHost,
  };

  // Hébergement.
  const onVercel = !!process.env.VERCEL;
  const envLabel =
    process.env.VERCEL_ENV === "production"
      ? "Production"
      : process.env.VERCEL_ENV === "preview"
        ? "Préversion"
        : process.env.VERCEL_ENV
          ? process.env.VERCEL_ENV
          : null;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  const hosting: SiteConnections["hosting"] = {
    provider: onVercel ? "Vercel" : "Machine locale (dev)",
    env: onVercel ? envLabel : "développement",
    url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    repo: owner && slug ? `${owner}/${slug}` : null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  return {
    hosting,
    database,
    storage,
    site: { url: process.env.NEXT_PUBLIC_SITE_URL || null },
  };
}

/** Libellés lisibles des tables (celles qui comptent pour le pilotage). */
const TABLE_LABELS: Record<string, string> = {
  visits: "Visites (analytics)",
  events: "Événements (analytics)",
  photos: "Photos",
  projects: "Projets",
  pricings: "Tarifs",
  categories: "Onglets",
  pages: "Pages",
  users: "Utilisateurs",
  site_settings: "Réglages",
};

/** Espace de référence du plan Neon (gratuit ≈ 512 Mo) — sert à exprimer
 *  l'usage en % compréhensible plutôt qu'en octets bruts. */
export const DB_QUOTA_BYTES = 512 * 1024 * 1024;

export type DatabaseStats = {
  /** Taille totale de la base (octets). */
  totalBytes: number;
  /** Latence d'un aller-retour SQL (ms) — santé de la connexion Neon. */
  pingMs: number;
  /** Tables les plus lourdes : taille (données + index) et lignes (estimation). */
  tables: { name: string; label: string; bytes: number; rows: number }[];
};

/**
 * État de la base de données (taille, tables, latence) pour le tableau de bord.
 * `n_live_tup` = estimation du planificateur (rafraîchie par autovacuum) : largement
 * assez précise pour un ordre de grandeur, et gratuite (pas de count(*) coûteux).
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const t0 = Date.now();
  const sizeRes = await db.execute(
    sql`select pg_database_size(current_database())::bigint as total`,
  );
  const pingMs = Date.now() - t0; // aller-retour réel (requête minuscule)

  const tablesRes = await db.execute(sql`
    select c.relname as name,
           pg_total_relation_size(c.oid)::bigint as bytes,
           coalesce(s.n_live_tup, 0)::bigint as rows
    from pg_class c
    join pg_stat_user_tables s on s.relid = c.oid
    order by pg_total_relation_size(c.oid) desc
  `);

  // Selon le driver (neon-http / node-postgres), le résultat est `{ rows }` ou un tableau.
  const rowsOf = (r: unknown): Record<string, unknown>[] =>
    Array.isArray(r)
      ? (r as Record<string, unknown>[])
      : ((r as { rows?: Record<string, unknown>[] }).rows ?? []);

  const total = Number(rowsOf(sizeRes)[0]?.total ?? 0);
  const tables = rowsOf(tablesRes)
    .map((t) => ({
      name: String(t.name),
      label: TABLE_LABELS[String(t.name)] ?? String(t.name),
      bytes: Number(t.bytes ?? 0),
      rows: Number(t.rows ?? 0),
    }))
    .filter((t) => !t.name.startsWith("__drizzle")); // table interne de migrations

  return { totalBytes: total, pingMs, tables };
}
