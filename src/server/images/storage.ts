import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Abstraction de stockage objet. Priorité :
 *  1. Stockage S3-compatible — si la config S3 est complète (Cloudflare R2,
 *     Backblaze B2, MinIO… : n'importe quel endpoint S3).
 *  2. Disque local — repli sans config (public/uploads), aucun compte cloud requis.
 *
 * Config S3 (variables `S3_*`) :
 *  - S3_ENDPOINT      ex. https://<account_id>.eu.r2.cloudflarestorage.com
 *  - S3_REGION        "auto" pour R2
 *  - S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
 *  - S3_BUCKET
 *  - S3_PUBLIC_URL    base publique de lecture, SANS slash final
 */
const S3 = (() => {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const publicBase = (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT;
  const enabled = Boolean(
    accessKeyId && secretAccessKey && bucket && publicBase && endpoint,
  );
  return { enabled, accessKeyId, secretAccessKey, bucket, publicBase, region, endpoint };
})();

const hasS3 = S3.enabled;

/** Client S3 (R2 / tout endpoint compatible). */
async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: S3.region,
    endpoint: S3.endpoint,
    // path-style = compatible partout (supporté par R2).
    forcePathStyle: true,
    credentials: {
      accessKeyId: S3.accessKeyId!,
      secretAccessKey: S3.secretAccessKey!,
    },
  });
}

function publicUrl(key: string) {
  if (hasS3) return `${S3.publicBase}/${key}`;
  return `/uploads/${key}`;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (hasS3) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    // Sur Vercel, les buffers de sharp sont adossés à un SharedArrayBuffer. Or, au
    // moment de signer la requête, le SDK AWS hashe le corps (SHA256) et smithy REFUSE
    // un SharedArrayBuffer ("input argument must be ArrayBuffer"). On recopie donc dans
    // un ArrayBuffer V8 classique (non partagé) puis on l'enveloppe en Buffer.
    const ab = new ArrayBuffer(body.byteLength);
    new Uint8Array(ab).set(body);
    const safeBody = Buffer.from(ab);
    await client.send(
      new PutObjectCommand({
        Bucket: S3.bucket!,
        Key: key,
        Body: safeBody,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return publicUrl(key);
  }

  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return publicUrl(key);
}

/** Supprime toutes les déclinaisons d'une photo (original + variants). */
export async function deletePhotoObjects(storageKey: string): Promise<void> {
  // storageKey = "photos/<hash>-<name>/original.jpg" → on vide tout le dossier
  const prefix = storageKey.replace(/\/original\.[^/]+$/, "");
  if (hasS3) {
    // Liste tout le dossier de la photo (original + variantes) puis supprime en lot.
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import(
      "@aws-sdk/client-s3"
    );
    const client = await s3Client();
    const Prefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: S3.bucket!, Prefix }),
    );
    const objects = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k))
      .map((Key) => ({ Key }));
    if (objects.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: S3.bucket!,
          Delete: { Objects: objects },
        }),
      );
    }
    return;
  }

  const dir = path.join(process.cwd(), "public", "uploads", prefix);
  await fs.rm(dir, { recursive: true, force: true });
}
