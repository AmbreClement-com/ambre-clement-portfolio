"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { pricings, type StoredImage } from "@/server/db/schema";
import { nextDisplayOrder } from "@/server/db/helpers";
import { requireAdmin } from "./guard";

// L'image est produite par notre propre route d'upload → validation souple.
const storedImage = z
  .object({
    variants: z.any(),
    lqip: z.string(),
    width: z.number(),
    height: z.number(),
  })
  .nullable();

const pricingInput = z.object({
  title: z.string().trim().min(1, "titre").max(120),
  subtitle: z.string().trim().max(200).optional().default(""),
  intro: z.string().max(5000).optional().default(""),
  includes: z.array(z.string().trim().max(200)).max(20).optional().default([]),
  price: z.string().trim().max(60).optional().default(""),
  image: storedImage.optional().default(null),
  published: z.boolean().optional().default(false),
});

function clean(data: z.infer<typeof pricingInput>) {
  return {
    title: data.title,
    subtitle: data.subtitle || null,
    intro: data.intro || null,
    includes: (data.includes ?? []).map((s) => s.trim()).filter(Boolean),
    price: data.price || null,
    image: (data.image as StoredImage | null) ?? null,
    published: data.published ?? false,
  };
}

function revalidate() {
  revalidatePath("/", "layout"); // navbar + /tarifs
}

/** Crée un tarif (placé en fin de liste). Renvoie le nouvel id ou une erreur. */
export async function createPricing(
  raw: unknown,
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const parsed = pricingInput.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.message ?? "un champ";
    return { error: `Le ${field} du tarif est invalide. Vérifiez le format.` };
  }
  const displayOrder = await nextDisplayOrder(pricings, pricings.displayOrder);
  const [row] = await db
    .insert(pricings)
    .values({ ...clean(parsed.data), displayOrder })
    .returning();
  revalidate();
  return { id: row.id };
}

/** Modifie un tarif existant. */
export async function updatePricing(
  id: string,
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = pricingInput.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.message ?? "un champ";
    return { error: `Le ${field} du tarif est invalide. Vérifiez le format.` };
  }
  await db
    .update(pricings)
    .set({ ...clean(parsed.data), updatedAt: new Date() })
    .where(eq(pricings.id, id));
  revalidate();
  return { ok: true };
}

/** Publie / dépublie un tarif (sans recharger toute la page d'édition). */
export async function togglePricingPublished(id: string, published: boolean) {
  await requireAdmin();
  await db
    .update(pricings)
    .set({ published, updatedAt: new Date() })
    .where(eq(pricings.id, id));
  revalidate();
}

/** Supprime un tarif. */
export async function deletePricing(id: string) {
  await requireAdmin();
  await db.delete(pricings).where(eq(pricings.id, id));
  revalidate();
}

/** Réordonne les tarifs : l'ordre du tableau = displayOrder (0,1,2…). */
export async function reorderPricings(ids: string[]) {
  await requireAdmin();
  await Promise.all(
    ids.map((id, i) =>
      db.update(pricings).set({ displayOrder: i }).where(eq(pricings.id, id)),
    ),
  );
  revalidate();
}
