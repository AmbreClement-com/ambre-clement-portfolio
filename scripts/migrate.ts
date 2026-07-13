/**
 * Applique les migrations SQL (dossier ./drizzle).
 *  - Neon (driver HTTP) si DATABASE_URL pointe sur neon.tech.
 *  - Postgres standard (node-postgres) pour toute autre DATABASE_URL.
 *  - PGlite local sinon.
 */
import "dotenv/config";

const FOLDER = "./drizzle";

async function main() {
  const url = process.env.DATABASE_URL;
  if (url && url.includes("neon.tech")) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const db = drizzle(neon(url));
    await migrate(db, { migrationsFolder: FOLDER });
    console.log("✓ Migrations appliquées (Neon)");
  } else if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 1 });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: FOLDER });
    await pool.end();
    console.log("✓ Migrations appliquées (Postgres)");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(".pglite");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: FOLDER });
    // Fermeture propre OBLIGATOIRE (flush sur disque) avant de quitter : sinon
    // `process.exit` coupe avant le checkpoint → data dir corrompu.
    await client.close();
    console.log("✓ Migrations appliquées (PGlite local)");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
