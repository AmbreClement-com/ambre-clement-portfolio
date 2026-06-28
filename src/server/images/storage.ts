import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Abstraction de stockage objet. Priorité :
 *  1. Cloudflare R2  — si les variables R2_* sont définies.
 *  2. Vercel Blob    — si BLOB_READ_WRITE_TOKEN est défini (stockage natif Vercel).
 *  3. Disque local   — dev (public/uploads), aucun compte cloud requis.
 */
const hasR2 = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
);
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function publicUrl(key: string) {
  // R2 : URL construite depuis le domaine public. Blob : l'URL est renvoyée par
  // `put()` (domaine du store dynamique) → cette fonction n'est pas utilisée pour Blob.
  if (hasR2) return `${process.env.R2_PUBLIC_URL}/${key}`;
  return `/uploads/${key}`;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (hasR2) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return publicUrl(key);
  }

  if (hasBlob) {
    const { put } = await import("@vercel/blob");
    // undici (le fetch utilisé par Blob) REFUSE un body adossé à un SharedArrayBuffer
    // ("ArrayBuffer: SharedArrayBuffer is not allowed"). Sur Vercel, les buffers de
    // sortie de sharp le sont → on RECOPIE dans une ArrayBuffer V8 classique, garantie
    // non partagée (`new Uint8Array(len)` n'utilise jamais le pool partagé).
    const safeBody = new Uint8Array(body.byteLength);
    safeBody.set(body);
    const { url } = await put(key, safeBody, {
      access: "public",
      contentType,
      addRandomSuffix: false, // le chemin = la clé (déterministe)
      allowOverwrite: true, // ré-upload du même hash → on écrase au lieu d'échouer
      cacheControlMaxAge: 31536000,
    });
    return url; // URL publique du blob (domaine du store)
  }

  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return publicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  if (hasR2) {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    );
    return;
  }

  if (hasBlob) {
    // `del()` attend une URL → on retrouve le blob par son chemin exact.
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key });
    const exact = blobs.find((b) => b.pathname === key);
    if (exact) await del(exact.url);
    return;
  }

  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await fs.rm(filePath, { force: true });
}

/** Supprime toutes les déclinaisons d'une photo (original + variants). */
export async function deletePhotoObjects(storageKey: string): Promise<void> {
  // storageKey = "photos/<hash>-<name>/original.jpg" → on vide tout le dossier
  const prefix = storageKey.replace(/\/original\.[^/]+$/, "");
  if (hasR2) {
    // Pour R2 : suppression best-effort de l'original (variants listés ailleurs).
    await deleteObject(storageKey);
    return;
  }

  if (hasBlob) {
    // Tous les blobs sous le préfixe (original + variants) en une fois.
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix });
    if (blobs.length) await del(blobs.map((b) => b.url));
    return;
  }

  const dir = path.join(process.cwd(), "public", "uploads", prefix);
  await fs.rm(dir, { recursive: true, force: true });
}
