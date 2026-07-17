/**
 * Applique les migrations SQL (dossier ./drizzle).
 *  - Neon (driver HTTP) si DATABASE_URL pointe sur neon.tech.
 *  - Postgres standard (node-postgres) pour toute autre DATABASE_URL.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env — ne remplace pas les variables déjà posées

const FOLDER = "./drizzle";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquant (.env.local) — voir .env.example.");
    process.exit(1);
  }
  if (url.includes("neon.tech")) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const db = drizzle(neon(url));
    await migrate(db, { migrationsFolder: FOLDER });
    console.log("✓ Migrations appliquées (Neon)");
  } else {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 1 });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: FOLDER });
    await pool.end();
    console.log("✓ Migrations appliquées (Postgres)");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
