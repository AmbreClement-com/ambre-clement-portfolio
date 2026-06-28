import sharp from "sharp";
import { createHash } from "node:crypto";
import { putObject } from "./storage";
import type { ImageVariants } from "@/server/db/schema";

/** Largeurs responsive générées pour chaque image. */
const WIDTHS = [480, 768, 1080, 1600, 2400] as const;

export type ProcessedImage = {
  storageKey: string;
  width: number;
  height: number;
  lqip: string;
  variants: ImageVariants;
};

/**
 * Pipeline d'optimisation :
 *  1. corrige l'orientation EXIF puis supprime les métadonnées
 *  2. ré-encode en AVIF + WebP à plusieurs largeurs — TOUS les encodes en PARALLÈLE
 *     (libvips est multi-thread) au lieu de séquentiellement → bien plus rapide
 *  3. génère un LQIP (placeholder flou base64) anti-CLS
 *  4. pousse l'original + les dérivés sur R2, là aussi EN PARALLÈLE
 *
 * Qualités élevées (AVIF 60 / WebP 80) : on privilégie la qualité d'image ; la
 * performance vient du parallélisme (ici) et de l'upload 1-photo-par-requête (client).
 */
export async function processAndUpload(
  input: Buffer,
  originalName: string,
): Promise<ProcessedImage> {
  // Sur Vercel, `file.arrayBuffer()` (undici) peut renvoyer un buffer adossé à un
  // SharedArrayBuffer, que sharp REFUSE en entrée ("SharedArrayBuffer is not allowed").
  // On le RECOPIE dans un Buffer classique (non partagé) avant tout traitement.
  const safeInput = Buffer.from(input);
  const base = sharp(safeInput).rotate(); // applique l'orientation EXIF
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const hash = createHash("sha256").update(input).digest("hex").slice(0, 16);
  const safeName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]/gi, "-");
  const prefix = `photos/${hash}-${safeName}`;

  // Largeurs à générer (jamais d'upscale). Fallback : si l'image est plus petite que
  // la plus petite cible, on génère au moins une variante à sa taille réelle.
  const targetWidths: number[] = WIDTHS.filter((w) => !width || w <= width);
  if (targetWidths.length === 0 && width) targetWidths.push(width);

  // ── ENCODAGE + UPLOAD, LARGEUR PAR LARGEUR (séquentiel) ──────────────────────────
  // On NE parallélise PAS les ~10 encodes : une grosse photo × 10 encodes AVIF
  // simultanés dépasse la mémoire de la fonction serverless Vercel (1024 Mo en Hobby,
  // non augmentable) → OOM et la fonction crashe (« impossible d'uploader »). Ici, par
  // largeur : avif + webp en parallèle (2 encodes max simultanés), puis upload, puis on
  // passe à la suivante. Mémoire bornée, vitesse correcte (1 photo = 1 requête).
  const storageKey = `${prefix}/original.jpg`;
  const variants: ImageVariants = { avif: [], webp: [] };

  for (const w of targetWidths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    const [avifBuf, webpBuf] = await Promise.all([
      resized.clone().avif({ quality: 60 }).toBuffer(),
      resized.clone().webp({ quality: 80 }).toBuffer(),
    ]);
    const [avifUrl, webpUrl] = await Promise.all([
      putObject(`${prefix}/${w}.avif`, avifBuf, "image/avif"),
      putObject(`${prefix}/${w}.webp`, webpBuf, "image/webp"),
    ]);
    variants.avif.push({ width: w, url: avifUrl }); // targetWidths déjà trié croissant
    variants.webp.push({ width: w, url: webpUrl });
  }

  // Original nettoyé + LQIP (légers), après les variantes.
  const originalBuf = await base.clone().toBuffer();
  await putObject(storageKey, originalBuf, "image/jpeg");
  const lqipBuf = await base
    .clone()
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();
  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;

  return { storageKey, width, height, lqip, variants };
}
