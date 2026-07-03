"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { siteSettings, users } from "@/server/db/schema";
import { settingsInput, animationsInput, contactInput } from "@/lib/validators";
import { isTypographyId, DEFAULT_TYPOGRAPHY } from "@/lib/typography-themes";
import { isThemeKey } from "@/lib/themes";
import { DEFAULT_ANIMATIONS } from "@/lib/animations";
import { requireAdmin } from "./guard";

/** Thème du back-office — réglage PROPRE À L'UTILISATEUR connecté (pas global). */
export async function updateTheme(theme: string) {
  const me = await requireAdmin();
  if (!isThemeKey(theme)) throw new Error("Thème invalide");
  if (!me.email) throw new Error("Votre session a expiré. Reconnectez-vous.");
  await db.update(users).set({ theme }).where(eq(users.email, me.email));
  revalidatePath("/admin", "layout");
}

/** Carte « Site » : identité (nom, domaine du cadre) + mentions légales. */
export async function updateSettings(raw: unknown) {
  await requireAdmin();

  // Validation tolérante : message clair (pas du JSON Zod brut) si un champ
  // est invalide — c'est ce qui faisait croire que « le form ne marche pas ».
  const parsed = settingsInput.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const labels: Record<string, string> = {
      siteName: "Le nom du site",
      frameDomain: "Le domaine affiché",
      legalNotice: "Les mentions légales",
    };
    const label =
      typeof field === "string" ? (labels[field] ?? "Un champ") : "Un champ";
    throw new Error(`${label} est invalide. Vérifiez le format.`);
  }
  const data = parsed.data;

  const set = {
    siteName: data.siteName?.trim() || null,
    frameDomain: data.frameDomain?.trim() || null,
    legalNotice: data.legalNotice || null,
  };
  await db
    .insert(siteSettings)
    .values({ id: 1, ...set, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set });

  revalidatePath("/", "layout"); // navbar (nom) + cadre (domaine) + mentions
}

/** Carte « Typographie » : thème typographique du site public (id du registre). */
export async function updateTypography(themeId: string) {
  await requireAdmin();
  if (!isTypographyId(themeId)) throw new Error("Thème typographique invalide");
  // Le thème par défaut est stocké NULL → aucun wrapper côté public (zéro coût).
  const typography = themeId === DEFAULT_TYPOGRAPHY ? null : themeId;
  await db
    .insert(siteSettings)
    .values({ id: 1, typography, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set: { typography } });
  revalidatePath("/", "layout"); // tout le site public change de voix
}

/** Graisse globale du thème typographique : « light » / « normal » / « bold ». */
export async function updateTypographyWeight(weight: string) {
  await requireAdmin();
  if (!["light", "normal", "bold"].includes(weight))
    throw new Error("Graisse invalide");
  const typographyWeight = weight === "normal" ? null : weight;
  await db
    .insert(siteSettings)
    .values({ id: 1, typographyWeight, defaultSeo: {} })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { typographyWeight },
    });
  revalidatePath("/", "layout");
}

/** Carte « Animations » : on/off + intensité + vitesses par effet. */
export async function updateAnimations(raw: unknown) {
  await requireAdmin();

  const parsed = animationsInput.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Un réglage d'animation est invalide. Réessayez.");
  }
  const animations = parsed.data.animations ?? DEFAULT_ANIMATIONS;

  await db
    .insert(siteSettings)
    .values({ id: 1, animations, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set: { animations } });

  revalidatePath("/", "layout");
}

/** Onglet Contact : coordonnées, réseaux sociaux + contenu de la page /contact. */
export async function updateContact(raw: unknown) {
  await requireAdmin();

  const parsed = contactInput.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const labels: Record<string, string> = {
      email: "L'adresse email",
      contactTitle: "Le titre",
      contactText: "Le texte",
      contactPhone: "Le numéro de téléphone",
      contactLocation: "Le lieu",
      socials: "Une URL de réseau social",
    };
    const label =
      typeof field === "string" ? (labels[field] ?? "Un champ") : "Un champ";
    throw new Error(`${label} est invalide. Vérifiez le format.`);
  }
  const data = parsed.data;

  const set = {
    email: data.email || null,
    contactTitle: data.contactTitle || null,
    contactText: data.contactText || null,
    contactPhone: data.contactPhone || null,
    contactLocation: data.contactLocation || null,
    socials: data.socials ?? [],
  };
  await db
    .insert(siteSettings)
    .values({ id: 1, ...set, defaultSeo: {} })
    .onConflictDoUpdate({ target: siteSettings.id, set });

  revalidatePath("/", "layout"); // cadre global (email + réseaux) + page contact
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
