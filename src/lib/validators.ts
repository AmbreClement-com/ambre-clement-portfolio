import { z } from "zod";
import { SOCIAL_PLATFORMS } from "./social-platforms";

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (kebab-case attendu)");

export const projectInput = z.object({
  title: z.string().min(1, "Titre requis").max(200),
  slug,
  description: z.string().max(5000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  shotDate: z.string().optional().nullable(),
  published: z.boolean().default(false),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
});

/** Alt text OBLIGATOIRE — exigence SEO/accessibilité. */
export const photoMetaInput = z.object({
  id: z.string().uuid(),
  altText: z.string().min(1, "Le texte alternatif est obligatoire").max(300),
});

export const reorderInput = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

/** Onglet Contact (admin) : coordonnées, réseaux sociaux + page publique /contact. */
export const contactInput = z.object({
  email: z.string().email().optional().or(z.literal("")),
  contactTitle: z.string().max(200).optional(),
  contactText: z.string().max(2000).optional(),
  contactPhone: z.string().max(30).optional(),
  contactLocation: z.string().max(120).optional(),
  socials: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        url: z.string().url(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

/** Carte « Site » (admin) : identité du site + mentions légales. */
export const settingsInput = z.object({
  siteName: z.string().max(60).optional(),
  frameDomain: z.string().max(100).optional(),
  legalNotice: z.string().max(10000).optional(),
});

/** Carte « Animations » (admin) : on/off + intensité + vitesses par effet. */
export const animationsInput = z.object({
  animations: z.object({
    cursorEnabled: z.boolean(),
    cursorIntensity: z.number().min(0).max(200),
    photoHoverEnabled: z.boolean(),
    photoHoverIntensity: z.number().min(0).max(200),
    photoDimEnabled: z.boolean(),
    photoDimIntensity: z.number().min(0).max(200),
    scrollWaveEnabled: z.boolean(),
    scrollWaveIntensity: z.number().min(0).max(200),
    infiniteScrollEnabled: z.boolean(),
    pageTransitionEnabled: z.boolean(),
    pageTransitionSpeed: z.enum(["slow", "medium", "fast"]),
    loaderEnabled: z.boolean(),
    loaderSpeed: z.enum(["slow", "medium", "fast"]),
    projectTransitionEnabled: z.boolean(),
    projectTransitionSpeed: z.enum(["slow", "medium", "fast"]),
  }),
});

/** Slugs réservés (routes fixes) — interdits pour les catégories. */
export const RESERVED_SLUGS = [
  "projects",
  "contact",
  "mentions-legales",
  "admin",
  "api",
];

export const categoryInput = z.object({
  name: z.string().min(1, "Nom requis").max(60),
  type: z.enum(["photos", "projects"]),
});

export const profileInput = z.object({
  firstName: z.string().max(60).optional().or(z.literal("")),
  lastName: z.string().max(60).optional().or(z.literal("")),
});

/** Règles du mot de passe — UNIQUE source de vérité (client + serveur). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`,
  )
  .max(
    PASSWORD_MAX,
    `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères.`,
  );

/** Première raison de refus d'un mot de passe, ou null s'il est accepté. */
export function passwordIssue(password: string): string | null {
  const res = passwordSchema.safeParse(password);
  return res.success ? null : res.error.issues[0].message;
}

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: passwordSchema,
});

/** Helper : slug SEO à partir d'un titre. */
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
