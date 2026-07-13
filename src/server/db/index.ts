import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

const g = globalThis as unknown as {
  __db?: DB;
  __pg?: PGlite;
  __pgHooked?: boolean;
};

function getDb(): DB {
  if (g.__db) return g.__db;

  const url = process.env.DATABASE_URL;
  if (url) {
    if (url.includes("neon.tech")) {
      // Neon : driver HTTP serverless (optimal sur Vercel — pas de connexion à garder).
      g.__db = drizzleNeon(neon(url), { schema });
    } else {
      // PORTABILITÉ : tout Postgres standard (VPS, RDS, Scaleway, Supabase…) via
      // node-postgres. Pool court (serverless : 1 pool par instance de fonction).
      const pool = new Pool({ connectionString: url, max: 3 });
      g.__db = drizzlePg(pool, { schema }) as unknown as DB;
    }
  } else {
    // Développement local : Postgres en WASM (PGlite), persisté sur disque.
    const pg = new PGlite(".pglite");
    g.__pg = pg;
    g.__db = drizzlePglite(pg, { schema }) as unknown as DB;

    // CRITIQUE : PGlite ne tolère qu'une connexion et doit être FERMÉ proprement
    // (checkpoint + flush sur disque). Un arrêt brutal (SIGTERM via `kill`) en
    // plein écrit corrompt le data dir → `RuntimeError: Aborted()` au prochain
    // accès. On intercepte donc les signaux pour fermer avant de quitter.
    if (!g.__pgHooked) {
      g.__pgHooked = true;
      const shutdown = async () => {
        try {
          await g.__pg?.close();
        } catch {
          /* best-effort */
        }
      };
      process.once("SIGINT", async () => {
        await shutdown();
        process.exit(0);
      });
      process.once("SIGTERM", async () => {
        await shutdown();
        process.exit(0);
      });
      process.once("beforeExit", shutdown);
    }
  }
  return g.__db;
}

/** Ferme proprement PGlite (flush). À appeler en fin de script avant de quitter. */
export async function closeDb(): Promise<void> {
  try {
    await g.__pg?.close();
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
