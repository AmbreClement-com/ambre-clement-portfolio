/**
 * Seed du CONTENU de base uniquement : catégories + réglages.
 * (Le compte admin, qui exige un mot de passe, se crée séparément via `npm run seed`.)
 * Usage :  npx tsx scripts/seed-base.ts   (serveur dev arrêté — verrou PGlite)
 */
import "dotenv/config";
import { db, closeDb } from "../src/server/db";
import { categories, siteSettings } from "../src/server/db/schema";

async function main() {
  await db
    .insert(categories)
    .values([
      { name: "Portfolio", slug: "portfolio", type: "photos", displayOrder: 0 },
      { name: "Maternité", slug: "maternite", type: "photos", displayOrder: 1 },
      { name: "Projets", slug: "projets", type: "projects", displayOrder: 2 },
    ])
    .onConflictDoNothing();
  console.log("✓ Catégories par défaut");

  await db
    .insert(siteSettings)
    .values({
      id: 1,
      email: "ambreclmnt@icloud.com",
      instagramUrl: "https://instagram.com/ambreclementphoto",
      defaultSeo: {},
    })
    // upsert sur l'email uniquement : pose la valeur si la ligne existe déjà
    // (re-seed) sans écraser les autres réglages saisis via l'admin.
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { email: "ambreclmnt@icloud.com" },
    });
  console.log("✓ Réglages initiaux (email de contact inclus)");

  console.log("Seed de base terminé.");
  await closeDb(); // flush PGlite avant de quitter (anti-corruption)
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
