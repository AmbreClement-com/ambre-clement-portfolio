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

  // ── ENCODAGE (séquentiel, mémoire bornée) puis UPLOAD (tout en parallèle) ─────────
  // AVIF `effort: 2` : ~7× plus rapide qu'effort 4 (le défaut) pour une qualité
  // IDENTIQUE — l'effort ne joue QUE sur la taille du fichier, pas sur la qualité
  // visuelle. On encode largeur par largeur (2 encodes max simultanés → mémoire bornée,
  // pas d'OOM serverless), on collecte les buffers, PUIS on pousse l'original + toutes
  // les variantes EN PARALLÈLE sur le store (réseau) → upload quasi instantané.
  const storageKey = `${prefix}/original.jpg`;
  const encoded: { fmt: "avif" | "webp"; w: number; buf: Buffer; ct: string }[] =
    [];
  for (const w of targetWidths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    const [avifBuf, webpBuf] = await Promise.all([
      resized.clone().avif({ quality: 60, effort: 2 }).toBuffer(),
      resized.clone().webp({ quality: 80 }).toBuffer(),
    ]);
    encoded.push({ fmt: "avif", w, buf: avifBuf, ct: "image/avif" });
    encoded.push({ fmt: "webp", w, buf: webpBuf, ct: "image/webp" });
  }
  const originalBuf = await base.clone().toBuffer();
  const lqipBuf = await base
    .clone()
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();

  // Upload de l'original + toutes les variantes EN PARALLÈLE (réseau, peu de mémoire).
  const variants: ImageVariants = { avif: [], webp: [] };
  const [uploaded] = await Promise.all([
    Promise.all(
      encoded.map(async (e) => ({
        fmt: e.fmt,
        width: e.w,
        url: await putObject(`${prefix}/${e.w}.${e.fmt}`, e.buf, e.ct),
      })),
    ),
    putObject(storageKey, originalBuf, "image/jpeg"),
  ]);
  for (const v of uploaded) variants[v.fmt].push({ width: v.width, url: v.url });
  variants.avif.sort((a, b) => a.width - b.width);
  variants.webp.sort((a, b) => a.width - b.width);

  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;
  return { storageKey, width, height, lqip, variants };
}
