/**
 * Génère un jeu de données réaliste :
 *   - 6 projets (5 photos chacun)
 *   - 30 photos Portfolio
 *   - 20 photos Maternité
 * Les images sont des dégradés générés à la volée (sharp) puis passés dans
 * le pipeline d'optimisation (AVIF/WebP + LQIP) et stockés comme en prod.
 *
 * Usage :  npm run seed:data   (serveur dev arrêté — verrou PGlite)
 */
import "dotenv/config";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/server/db";
import { projects, photos, categories, visits } from "../src/server/db/schema";

const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Visites de démo réalistes sur 14 jours (pour le tableau de bord). */
async function seedVisits() {
  await db.delete(visits);
  const paths = [
    "/", "/", "/", "/", "/maternite", "/maternite", "/projets", "/projets",
    "/contact", "/projects/prana", "/projects/nomade", "/projects/lumiere-du-nord",
    "/projects/racines", "/projects/ocean", "/projects/silhouettes", "/mentions-legales",
  ];
  const visitors = Array.from({ length: 60 }, () => randomUUID());
  const dayStart0 = new Date();
  dayStart0.setHours(0, 0, 0, 0);

  const rows: (typeof visits.$inferInsert)[] = [];
  for (let day = 13; day >= 0; day--) {
    const dayStart = dayStart0.getTime() - day * 86_400_000;
    const maxOffset = day === 0 ? Date.now() - dayStart : 86_400_000 - 1;
    const sessions = randInt(4, 22);
    for (let s = 0; s < sessions; s++) {
      const visitorId = pickOne(visitors);
      const sessionId = randomUUID();
      const pages = randInt(1, 5);
      let at = dayStart + randInt(0, Math.max(1, maxOffset - pages * 90_000));
      for (let p = 0; p < pages; p++) {
        rows.push({
          id: randomUUID(),
          path: pickOne(paths),
          visitorId,
          sessionId,
          durationMs: randInt(4, 200) * 1000,
          createdAt: new Date(at),
        });
        at += randInt(5, 90) * 1000;
      }
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(visits).values(rows.slice(i, i + 200));
  }
  console.log(`✓ ${rows.length} visites de démo`);
}
import { processAndUpload } from "../src/server/images/process";
import { slugify } from "../src/lib/validators";

const PALETTES: [string, string][] = [
  ["#e8d5c4", "#85586f"],
  ["#a3c9a8", "#386641"],
  ["#f6bd60", "#bc4749"],
  ["#cdb4db", "#5e548e"],
  ["#d8c3a5", "#3a5a78"],
  ["#ffcad4", "#9d8189"],
  ["#bde0fe", "#3d5a80"],
  ["#fae1dd", "#6d6875"],
  ["#dde5b6", "#588157"],
  ["#f7ede2", "#a26769"],
  ["#caf0f8", "#0077b6"],
  ["#ffd6a5", "#bc6c25"],
];
const DIMS: [number, number][] = [
  [880, 1200],
  [1000, 1300],
  [1200, 820],
  [1050, 1050],
];

let pi = 0;
let di = 0;
const nextPal = () => PALETTES[pi++ % PALETTES.length];
const nextDim = () => DIMS[di++ % DIMS.length];

function svg(w: number, h: number, a: string, b: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 12)}"
      fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
}

let seedN = 0;

/**
 * Récupère une vraie photo libre (Picsum, sans clé API). Repli sur un dégradé
 * généré localement si le réseau échoue, pour que le seed n'échoue jamais.
 */
async function acquire(w: number, h: number, label: string): Promise<Buffer> {
  const seed = `ambre-${seedN++}`;
  try {
    const res = await fetch(`https://picsum.photos/seed/${seed}/${w}/${h}`, {
      redirect: "follow",
    });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error("réponse trop petite");
    return buf;
  } catch {
    const [a, b] = nextPal();
    return sharp(Buffer.from(svg(w, h, a, b, label))).jpeg({ quality: 90 }).toBuffer();
  }
}

async function add(opts: {
  projectId?: string;
  categoryId?: string;
  label: string;
  order: number;
}) {
  const [w, h] = nextDim();
  const buf = await acquire(w, h, opts.label);
  const p = await processAndUpload(
    buf,
    opts.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".jpg",
  );
  await db.insert(photos).values({
    projectId: opts.projectId ?? null,
    categoryId: opts.projectId ? null : (opts.categoryId ?? null),
    storageKey: p.storageKey,
    altText: opts.label,
    width: p.width,
    height: p.height,
    lqip: p.lqip,
    variants: p.variants,
    displayOrder: opts.order,
  });
}

async function categoryId(slug: string): Promise<string> {
  const c = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (!c) throw new Error(`Catégorie « ${slug} » absente (lancer le seed/backfill).`);
  return c.id;
}

const PROJECT_DEFS = [
  { t: "Prana", loc: "Siargao, Philippines" },
  { t: "Nomade", loc: "Marrakech, Maroc" },
  { t: "Lumière du Nord", loc: "Lofoten, Norvège" },
  { t: "Racines", loc: "Cévennes, France" },
  { t: "Océan", loc: "Biarritz, France" },
  { t: "Silhouettes", loc: "Lisbonne, Portugal" },
];

async function main() {
  console.log("Nettoyage des données existantes…");
  await db.delete(photos);
  await db.delete(projects);

  const portfolioId = await categoryId("portfolio");
  const materniteId = await categoryId("maternite");
  const projetsId = await categoryId("projets");

  for (let i = 0; i < PROJECT_DEFS.length; i++) {
    const d = PROJECT_DEFS[i];
    const [proj] = await db
      .insert(projects)
      .values({
        title: d.t,
        slug: slugify(d.t),
        location: d.loc,
        description: `Série photographique réalisée à ${d.loc}.`,
        categoryId: projetsId,
        published: true,
        publishedAt: new Date(),
        displayOrder: i,
      })
      .returning();
    for (let k = 0; k < 5; k++) {
      await add({ projectId: proj.id, label: `${d.t} ${k + 1}`, order: k });
    }
    console.log(`✓ Projet « ${d.t} » (+5 photos)`);
  }

  for (let i = 0; i < 30; i++) {
    await add({ categoryId: portfolioId, label: `Portfolio ${i + 1}`, order: i });
  }
  console.log("✓ 30 photos Portfolio");

  for (let i = 0; i < 20; i++) {
    await add({ categoryId: materniteId, label: `Maternité ${i + 1}`, order: i });
  }
  console.log("✓ 20 photos Maternité");

  await seedVisits();

  console.log("Terminé : 6 projets, 30 Portfolio, 20 Maternité + visites démo.");
  await closeDb(); // flush PGlite avant de quitter (anti-corruption)
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
