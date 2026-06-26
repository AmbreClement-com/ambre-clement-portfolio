"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { siteSettings } from "@/server/db/schema";
import { settingsInput } from "@/lib/validators";
import { isThemeKey } from "@/lib/themes";
import { DEFAULT_ANIMATIONS } from "@/lib/animations";
import { requireAdmin } from "./guard";

export async function updateTheme(theme: string) {
  await requireAdmin();
  if (!isThemeKey(theme)) throw new Error("Thème invalide");
  await db
    .insert(siteSettings)
    .values({ id: 1, theme, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set: { theme } });
  revalidatePath("/", "layout");
}

export async function updateSettings(raw: unknown) {
  await requireAdmin();

  // Validation tolérante : message clair (pas du JSON Zod brut) si un champ
  // est invalide — c'est ce qui faisait croire que « le form ne marche pas ».
  const parsed = settingsInput.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const labels: Record<string, string> = {
      email: "L'adresse email",
      socials: "Une URL de réseau social",
      contactTitle: "Le titre",
      contactText: "Le texte",
      legalNotice: "Les mentions légales",
    };
    const label =
      typeof field === "string" ? (labels[field] ?? "Un champ") : "Un champ";
    throw new Error(`${label} est invalide. Vérifiez le format.`);
  }
  const data = parsed.data;

  const socials = data.socials ?? [];
  const animations = data.animations ?? DEFAULT_ANIMATIONS;

  await db
    .insert(siteSettings)
    .values({
      id: 1,
      email: data.email || null,
      contactTitle: data.contactTitle || null,
      contactText: data.contactText || null,
      legalNotice: data.legalNotice || null,
      socials,
      animations,
      defaultSeo: {},
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        email: data.email || null,
        contactTitle: data.contactTitle || null,
        contactText: data.contactText || null,
        legalNotice: data.legalNotice || null,
        socials,
        animations,
      },
    });

  revalidatePath("/", "layout"); // cadre global + contact
}

/** Retire l'image de la page Contact. */
export async function clearContactImage() {
  await requireAdmin();
  await db
    .insert(siteSettings)
    .values({ id: 1, contactImage: null, defaultSeo: {} })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { contactImage: null },
    });
  revalidatePath("/", "layout");
}
