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
  const base = sharp(input).rotate(); // applique l'orientation EXIF
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

  // ── 1) ENCODAGE en parallèle : variantes AVIF+WebP, original nettoyé, LQIP ────────
  const encodeTasks = targetWidths.flatMap((w) => {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    return [
      resized
        .clone()
        .avif({ quality: 60 })
        .toBuffer()
        .then((buf) => ({ fmt: "avif" as const, w, buf, ct: "image/avif" })),
      resized
        .clone()
        .webp({ quality: 80 })
        .toBuffer()
        .then((buf) => ({ fmt: "webp" as const, w, buf, ct: "image/webp" })),
    ];
  });

  const [encoded, originalBuf, lqipBuf] = await Promise.all([
    Promise.all(encodeTasks),
    base.clone().toBuffer(), // original (orienté + métadonnées nettoyées)
    base.clone().resize({ width: 24 }).webp({ quality: 30 }).toBuffer(),
  ]);

  // ── 2) UPLOAD R2 en parallèle (original + toutes les variantes) ───────────────────
  const storageKey = `${prefix}/original.jpg`;
  const [uploadedVariants] = await Promise.all([
    Promise.all(
      encoded.map(async (e) => ({
        fmt: e.fmt,
        width: e.w,
        url: await putObject(`${prefix}/${e.w}.${e.fmt}`, e.buf, e.ct),
      })),
    ),
    putObject(storageKey, originalBuf, "image/jpeg"),
  ]);

  // Variantes triées par largeur croissante (les composants attendent cet ordre).
  const variants: ImageVariants = { avif: [], webp: [] };
  for (const v of [...uploadedVariants].sort((a, b) => a.width - b.width)) {
    variants[v.fmt].push({ width: v.width, url: v.url });
  }

  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;
  return { storageKey, width, height, lqip, variants };
}
