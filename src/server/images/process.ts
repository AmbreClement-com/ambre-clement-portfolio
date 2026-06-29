import sharp from "sharp";
import { createHash } from "node:crypto";
import { putObject } from "./storage";
import type { ImageVariants } from "@/server/db/schema";

/** Largeurs responsive générées pour chaque image (WebP). */
const WIDTHS = [480, 1080, 1600, 2400] as const;

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
 *  2. ré-encode en WebP (q80) à plusieurs largeurs — TOUS les encodes en PARALLÈLE
 *     (libvips est multi-thread) → upload rapide. L'AVIF a été retiré de l'upload :
 *     ~5-10× plus lent à encoder, il plombait le temps d'upload sur le CPU de Vercel.
 *     Le WebP q80 est visuellement parfait pour le web (fichiers ~15-20% plus gros
 *     que l'AVIF, sans différence visible).
 *  3. génère un LQIP (placeholder flou base64) anti-CLS
 *  4. pousse l'original + les dérivés sur le store, là aussi EN PARALLÈLE
 */
export async function processAndUpload(
  input: Buffer,
  originalName: string,
): Promise<ProcessedImage> {
  // Sur Vercel, `file.arrayBuffer()` (undici) peut renvoyer un buffer adossé à un
  // SharedArrayBuffer, que sharp ET crypto REFUSENT ("SharedArrayBuffer is not allowed").
  // On le RECOPIE une fois dans un Buffer classique (non partagé) et on l'utilise PARTOUT
  // (sharp + hash) — sinon le hash plantait après que sharp ait réussi.
  const safeInput = Buffer.from(input);

  // PLAFOND SERVEUR à 2560 px. Si une image PLEINE RÉSOLUTION arrive (redimensionnement
  // navigateur inactif), on la borne ICI → le traitement ET l'original stocké restent
  // légers (~1 Mo) au lieu de 15-40 Mo, donc pas de timeout serveur. La plus grande
  // variante affichée fait 2400 px → aucune perte de qualité visible.
  const probe = await sharp(safeInput).metadata();
  const tooBig = Math.max(probe.width ?? 0, probe.height ?? 0) > 2560;
  const source = tooBig
    ? await sharp(safeInput)
        .rotate()
        .resize({ width: 2560, height: 2560, fit: "inside" })
        .toBuffer()
    : safeInput;

  const base = sharp(source).rotate(); // EXIF (no-op si déjà plafonné)
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const hash = createHash("sha256").update(safeInput).digest("hex").slice(0, 16);
  const safeName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]/gi, "-");
  const prefix = `photos/${hash}-${safeName}`;

  // Largeurs à générer (jamais d'upscale). Fallback : si l'image est plus petite que
  // la plus petite cible, on génère au moins une variante à sa taille réelle.
  const targetWidths: number[] = WIDTHS.filter((w) => !width || w <= width);
  if (targetWidths.length === 0 && width) targetWidths.push(width);

  // ── ENCODAGE (WebP, TOUT en parallèle) puis UPLOAD (tout en parallèle) ────────────
  // WebP est rapide → on encode toutes les largeurs + l'original + le LQIP en parallèle
  // (libvips multi-thread, mémoire bornée par le plafond 2560 px). Puis upload parallèle.
  const storageKey = `${prefix}/original.jpg`;
  const [webpBufs, originalBuf, lqipBuf] = await Promise.all([
    Promise.all(
      targetWidths.map(async (w) => ({
        w,
        buf: await base
          .clone()
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    ),
    base.clone().toBuffer(),
    base.clone().resize({ width: 24 }).webp({ quality: 30 }).toBuffer(),
  ]);

  // Upload de l'original + toutes les variantes WebP EN PARALLÈLE.
  const variants: ImageVariants = { avif: [], webp: [] };
  const [uploadedWebp] = await Promise.all([
    Promise.all(
      webpBufs.map(async (e) => ({
        width: e.w,
        url: await putObject(`${prefix}/${e.w}.webp`, e.buf, "image/webp"),
      })),
    ),
    putObject(storageKey, originalBuf, "image/jpeg"),
  ]);
  variants.webp = uploadedWebp.sort((a, b) => a.width - b.width);

  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;
  return { storageKey, width, height, lqip, variants };
}
