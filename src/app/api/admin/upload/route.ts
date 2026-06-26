import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { photos } from "@/server/db/schema";
import { processAndUpload } from "@/server/images/process";

export const runtime = "nodejs"; // sharp nécessite Node
export const maxDuration = 60;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo

/** Vérifie la signature binaire réelle du fichier (ne pas se fier au Content-Type). */
function isSupportedImage(buf: Buffer): boolean {
  const ascii = (start: number, len: number) =>
    buf.subarray(start, start + len).toString("latin1");
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (ascii(1, 3) === "PNG") return true;
  // WebP : RIFF....WEBP
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return true;
  // AVIF/HEIF : ....ftyp + marque avif/heic
  if (ascii(4, 4) === "ftyp" && /avif|heic|mif1|msf1/.test(ascii(8, 4))) return true;
  // TIFF
  if (ascii(0, 2) === "II" || ascii(0, 2) === "MM") return true;
  return false;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await req.formData();
  const projectIdRaw = form.get("projectId");
  const categoryIdRaw = form.get("categoryId");
  const orderRaw = form.get("order");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  // Ordre explicite fourni par le client (uploads parallèles 1-photo-par-requête) →
  // chaque requête connaît sa position, donc pas de course sur le max() en base.
  const explicitOrder =
    typeof orderRaw === "string" && orderRaw !== "" && Number.isFinite(Number(orderRaw))
      ? Number(orderRaw)
      : null;

  // Cible : soit un projet, soit une catégorie de type "photos".
  const projectId =
    typeof projectIdRaw === "string" && projectIdRaw ? projectIdRaw : null;
  const categoryId =
    typeof categoryIdRaw === "string" && categoryIdRaw ? categoryIdRaw : null;

  if (!projectId && !categoryId) {
    return NextResponse.json(
      { error: "projectId ou categoryId requis" },
      { status: 400 },
    );
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  }

  // Ordre de départ : explicite (client) sinon juste après le dernier de la cible.
  let order: number;
  if (explicitOrder !== null) {
    order = explicitOrder;
  } else {
    const targetCond = projectId
      ? eq(photos.projectId, projectId)
      : and(isNull(photos.projectId), eq(photos.categoryId, categoryId!));
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${photos.displayOrder}), -1)` })
      .from(photos)
      .where(targetCond);
    order = Number(max) + 1;
  }

  const created = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (!ACCEPTED.includes(file.type) || file.size > MAX_SIZE) {
      skipped.push(file.name);
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!isSupportedImage(buffer)) {
        skipped.push(file.name);
        continue;
      }
      const processed = await processAndUpload(buffer, file.name);
      const [row] = await db
        .insert(photos)
        .values({
          projectId,
          categoryId: projectId ? null : categoryId,
          storageKey: processed.storageKey,
          altText: file.name.replace(/\.[^.]+$/, ""),
          width: processed.width,
          height: processed.height,
          lqip: processed.lqip,
          variants: processed.variants,
          displayOrder: order++,
        })
        .returning();
      created.push(row);
    } catch {
      skipped.push(file.name);
    }
  }

  // Invalide la surface publique (onglets dynamiques)
  revalidatePath("/", "layout");

  return NextResponse.json({ photos: created, skipped });
}
