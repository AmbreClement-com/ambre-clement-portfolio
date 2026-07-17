import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

const g = globalThis as unknown as {
  __db?: DB;
  __pool?: Pool;
};

function getDb(): DB {
  if (g.__db) return g.__db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Renseigner .env.local (branche Neon `dev`) — voir .env.example.",
    );
  }
  if (url.includes("neon.tech")) {
    // Neon : driver HTTP serverless (optimal sur Vercel — pas de connexion à garder).
    g.__db = drizzleNeon(neon(url), { schema });
  } else {
    // PORTABILITÉ : tout Postgres standard (VPS, RDS, Scaleway…) via
    // node-postgres. Pool court (serverless : 1 pool par instance de fonction).
    const pool = new Pool({ connectionString: url, max: 3 });
    g.__pool = pool;
    g.__db = drizzlePg(pool, { schema }) as unknown as DB;
  }
  return g.__db;
}

/** Ferme la connexion (pool node-postgres ; no-op sur Neon HTTP). À appeler en fin de script. */
export async function closeDb(): Promise<void> {
  try {
    await g.__pool?.end();
  } catch {
    /* best-effort */
  }
}

/**
 * Proxy paresseux : la connexion n'est créée qu'au premier accès,
 * ce qui évite de planter au build quand l'env n'est pas disponible.
 */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
