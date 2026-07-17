/**
 * Migration de données vers le modèle « onglets = catégories ».
 * À lancer une fois après la migration de schéma (serveur arrêté).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env — ne remplace pas les variables déjà posées
import { eq, notInArray } from "drizzle-orm";
import { db, closeDb } from "../src/server/db";
import { categories, photos, projects } from "../src/server/db/schema";

const DEFAULTS = [
  { name: "Portfolio", slug: "portfolio", type: "photos", displayOrder: 0 },
  { name: "Maternité", slug: "maternite", type: "photos", displayOrder: 1 },
  { name: "Projets", slug: "projets", type: "projects", displayOrder: 2 },
] as const;

async function main() {
  const ids: Record<string, string> = {};

  // 1. Crée/normalise les 3 onglets par défaut
  for (const d of DEFAULTS) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, d.slug),
    });
    if (existing) {
      await db
        .update(categories)
        .set({ name: d.name, type: d.type, displayOrder: d.displayOrder })
        .where(eq(categories.id, existing.id));
      ids[d.slug] = existing.id;
    } else {
      const [row] = await db.insert(categories).values(d).returning();
      ids[d.slug] = row.id;
    }
  }

  // 2. Rattache les photos seules (ancienne colonne collection)
  await db
    .update(photos)
    .set({ categoryId: ids.portfolio })
    .where(eq(photos.collection, "portfolio"));
  await db
    .update(photos)
    .set({ categoryId: ids.maternite })
    .where(eq(photos.collection, "maternity"));

  // 3. Tous les projets existants → onglet « Projets »
  await db.update(projects).set({ categoryId: ids.projets });

  // 4. Supprime les anciennes catégories / tests
  await db
    .delete(categories)
    .where(notInArray(categories.slug, ["portfolio", "maternite", "projets"]));

  console.log("✓ Backfill catégories terminé :", ids);
  await closeDb(); // ferme la connexion avant de quitter (no-op sur Neon)
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
