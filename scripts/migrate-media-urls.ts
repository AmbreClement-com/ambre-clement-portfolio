/**
 * Bascule la BASE des URLs d'images stockées en base de données (migration de
 * stockage / passage au domaine `media.<domaine>`).
 *
 * Les URLs absolues vivent à 3 endroits (JSONB) :
 *   - photos.variants            ({ avif: [{url}], webp: [{url}] })
 *   - pricings.image             (StoredImage { variants, lqip })
 *   - site_settings.contact_image (StoredImage)
 *
 * Usage :
 *   npx tsx scripts/migrate-media-urls.ts --from https://ancien.exemple.com --to https://media.exemple.com
 *   npx tsx scripts/migrate-media-urls.ts --from ... --to ... --apply   # exécute (sinon DRY-RUN)
 *
 * DRY-RUN par défaut : affiche le nombre de lignes concernées et un échantillon,
 * ne modifie RIEN sans --apply. Faire un dump (pg_dump) AVANT tout --apply.
 */
import "dotenv/config";
import { closeDb, db } from "../src/server/db";
import { sql } from "drizzle-orm";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const FROM = (arg("from") ?? "").replace(/\/+$/, "");
const TO = (arg("to") ?? "").replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");

async function main() {
  if (!FROM || !TO || !FROM.startsWith("http") || !TO.startsWith("http")) {
    console.error(
      "Usage : tsx scripts/migrate-media-urls.ts --from <base-actuelle> --to <nouvelle-base> [--apply]",
    );
    process.exit(1);
  }

  // Comptages avant : lignes contenant l'ancienne base.
  const count = async (table: string, col: string) => {
    const r = await db.execute(
      sql.raw(
        `SELECT count(*)::int AS n FROM ${table} WHERE ${col}::text LIKE '%${FROM}%'`,
      ),
    );
    return (r.rows[0] as { n: number }).n;
  };
  const nPhotos = await count("photos", "variants");
  const nPricings = await count("pricings", "image");
  const nSettings = await count("site_settings", "contact_image");
  console.log(
    `Lignes contenant « ${FROM} » :\n` +
      `  photos.variants            ${nPhotos}\n` +
      `  pricings.image             ${nPricings}\n` +
      `  site_settings.contact_image ${nSettings}`,
  );

  if (!APPLY) {
    const sample = await db.execute(
      sql.raw(
        `SELECT variants::text AS v FROM photos WHERE variants::text LIKE '%${FROM}%' LIMIT 1`,
      ),
    );
    if (sample.rows[0])
      console.log(
        "\nÉchantillon avant :",
        (sample.rows[0] as { v: string }).v.slice(0, 200),
        "…",
      );
    console.log("\nDRY-RUN — rien n'a été modifié. Relancer avec --apply.");
    await closeDb();
    return;
  }

  // Remplacement en une passe par table (replace sur le texte du JSONB, recast).
  // Les URLs sont des chaînes opaques dans le JSON : un replace texte est sûr
  // tant que FROM est une base d'URL complète (https://…), jamais un fragment.
  await db.execute(
    sql.raw(
      `UPDATE photos SET variants = replace(variants::text, '${FROM}', '${TO}')::jsonb WHERE variants::text LIKE '%${FROM}%'`,
    ),
  );
  await db.execute(
    sql.raw(
      `UPDATE pricings SET image = replace(image::text, '${FROM}', '${TO}')::jsonb WHERE image::text LIKE '%${FROM}%'`,
    ),
  );
  await db.execute(
    sql.raw(
      `UPDATE site_settings SET contact_image = replace(contact_image::text, '${FROM}', '${TO}')::jsonb WHERE contact_image::text LIKE '%${FROM}%'`,
    ),
  );
  console.log(`\n✓ URLs basculées : ${FROM} → ${TO}`);
  console.log(
    "Penser à : vider le cache ISR (redeploy) + vérifier une page galerie.",
  );
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
