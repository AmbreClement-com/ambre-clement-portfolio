"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { photos } from "@/server/db/schema";
import { deletePhotoObjects } from "@/server/images/storage";
import { photoMetaInput, reorderInput } from "@/lib/validators";
import { requireAdmin } from "./guard";

export async function updatePhotoAlt(raw: unknown) {
  await requireAdmin();
  const { id, altText } = photoMetaInput.parse(raw);
  await db.update(photos).set({ altText }).where(eq(photos.id, id));
}

export async function deletePhoto(id: string) {
  await requireAdmin();
  const photo = await db.query.photos.findFirst({ where: eq(photos.id, id) });
  if (!photo) return;
  await db.delete(photos).where(eq(photos.id, id));
  await deletePhotoObjects(photo.storageKey).catch(() => {});
  revalidatePath("/", "layout");
}

/** Réordonne les photos : l'ordre du tableau = displayOrder (0,1,2…). */
export async function reorderPhotos(raw: unknown) {
  await requireAdmin();
  const { ids } = reorderInput.parse(raw);
  await Promise.all(
    ids.map((id, i) =>
      db.update(photos).set({ displayOrder: i }).where(eq(photos.id, id)),
    ),
  );
  revalidatePath("/", "layout");
}

/** Définit une photo comme couverture en la plaçant en tête (displayOrder 0). */
export async function setCover(projectId: string, photoId: string) {
  await requireAdmin();
  const list = await db.query.photos.findMany({
    where: eq(photos.projectId, projectId),
    orderBy: (p, { asc }) => [asc(p.displayOrder)],
  });
  const reordered = [
    photoId,
    ...list.map((p) => p.id).filter((id) => id !== photoId),
  ];
  await reorderPhotos({ ids: reordered });
}
