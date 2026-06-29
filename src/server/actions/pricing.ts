"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { siteSettings, type PricingContent } from "@/server/db/schema";
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

const pricingSchema = z.object({
  published: z.boolean(),
  navLabel: z.string().trim().min(1, "libellé").max(30),
  title: z.string().trim().min(1, "titre").max(120),
  subtitle: z.string().trim().max(200),
  intro: z.string().max(5000),
  includes: z.array(z.string().trim().max(200)).max(20),
  price: z.string().trim().max(60),
  image: storedImage,
});

/** Enregistre le contenu de la page Tarifs (et son état publié/non publié). */
export async function updatePricing(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.message ?? "un champ";
    return {
      error: `Le ${field} de la page Tarifs est invalide. Vérifiez le format.`,
    };
  }
  // includes : on retire les lignes vides.
  const pricing: PricingContent = {
    ...parsed.data,
    includes: parsed.data.includes.map((s) => s.trim()).filter(Boolean),
  } as PricingContent;

  await db
    .insert(siteSettings)
    .values({ id: 1, pricing, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set: { pricing } });

  revalidatePath("/", "layout"); // navbar + page /tarifs
  return { ok: true };
}
