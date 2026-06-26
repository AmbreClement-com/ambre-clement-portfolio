/**
 * Applique les migrations SQL (dossier ./drizzle).
 *  - Neon si DATABASE_URL est défini.
 *  - PGlite local sinon.
 */
import "dotenv/config";

const FOLDER = "./drizzle";

async function main() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const db = drizzle(neon(process.env.DATABASE_URL));
    await migrate(db, { migrationsFolder: FOLDER });
    console.log("✓ Migrations appliquées (Neon)");
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
