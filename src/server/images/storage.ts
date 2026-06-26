import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Abstraction de stockage objet.
 *  - Production : Cloudflare R2 (si les variables R2_* sont définies).
 *  - Local : disque sous public/uploads (aucun compte cloud requis).
 */
const hasR2 = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
);

export function publicUrl(key: string) {
  return hasR2 ? `${process.env.R2_PUBLIC_URL}/${key}` : `/uploads/${key}`;
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
  } else {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }
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
  } else {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await fs.rm(filePath, { force: true });
  }
}

/** Supprime toutes les déclinaisons d'une photo (original + variants). */
export async function deletePhotoObjects(storageKey: string): Promise<void> {
  // storageKey = "photos/<hash>-<name>/original.jpg" → on vide tout le dossier
  const prefix = storageKey.replace(/\/original\.[^/]+$/, "");
  if (hasR2) {
    // Pour R2 : suppression best-effort des clés connues (variants listés ailleurs).
    await deleteObject(storageKey);
  } else {
    const dir = path.join(process.cwd(), "public", "uploads", prefix);
    await fs.rm(dir, { recursive: true, force: true });
  }
}
