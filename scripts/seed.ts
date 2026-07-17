/**
 * Seed initial : crée le compte admin + les catégories de base.
 * Usage :  ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env — ne remplace pas les variables déjà posées
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/server/db";
import { users, categories, siteSettings } from "../src/server/db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Définir ADMIN_EMAIL et ADMIN_PASSWORD");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!existing) {
    const passwordHash = await hash(password);
    await db.insert(users).values({
      email,
      passwordHash,
      firstName: "Ambre",
      lastName: "Clément",
      name: "Ambre Clément",
    });
    console.log(`✓ Admin créé : ${email}`);
  } else {
    console.log("• Admin déjà présent");
  }

  await db
    .insert(categories)
    .values([
      { name: "Portfolio", slug: "portfolio", type: "photos", displayOrder: 0 },
      { name: "Maternité", slug: "maternite", type: "photos", displayOrder: 1 },
      { name: "Projets", slug: "projets", type: "projects", displayOrder: 2 },
    ])
    .onConflictDoNothing();
  console.log("✓ Onglets par défaut");

  await db
    .insert(siteSettings)
    .values({
      id: 1,
      instagramUrl: "https://instagram.com/ambreclementphoto",
      defaultSeo: {},
    })
    .onConflictDoNothing();
  console.log("✓ Réglages initiaux");

  console.log("Seed terminé.");
  await closeDb(); // ferme la connexion avant de quitter
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
