import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  projects,
  photos,
  categories,
  siteSettings,
  pricings,
} from "@/server/db/schema";

/* ------------------------------- Tarifs -------------------------- */

/** Tarifs PUBLIÉS (page publique /tarifs + visibilité de l'onglet « Tarifs »). */
export async function getPublishedPricings() {
  return db
    .select()
    .from(pricings)
    .where(eq(pricings.published, true))
    .orderBy(asc(pricings.displayOrder));
}

/** Tous les tarifs (admin). */
export async function getAllPricings() {
  return db.select().from(pricings).orderBy(asc(pricings.displayOrder));
}

/* ---------------------------- Catégories ------------------------- */

/** Toutes les catégories ordonnées — pour la navigation et l'admin. */
export async function getNavCategories() {
  return db.select().from(categories).orderBy(asc(categories.displayOrder));
}
/** Catégories de type "projets" — pour le sélecteur du formulaire projet. */
export async function getProjectCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.type, "projects"))
    .orderBy(asc(categories.displayOrder));
}

export async function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

export async function getCategoryById(id: string) {
  return db.query.categories.findFirst({ where: eq(categories.id, id) });
}

/** Première catégorie (page d'accueil). */
export async function getFirstCategory() {
  const [row] = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder))
    .limit(1);
  return row ?? null;
}

/* ----------------- Contenu d'une catégorie (public) -------------- */

/** Photos seules d'une catégorie (type "photos"), ordonnées. */
export async function getCategoryPhotos(categoryId: string) {
  return db.query.photos.findMany({
    where: and(isNull(photos.projectId), eq(photos.categoryId, categoryId)),
    orderBy: [asc(photos.displayOrder)],
  });
}

/** Projets publiés d'une catégorie (type "projets") + miniature. */
export async function getCategoryProjects(categoryId: string) {
  return db.query.projects.findMany({
    where: and(
      eq(projects.published, true),
      eq(projects.categoryId, categoryId),
    ),
    orderBy: [asc(projects.displayOrder)],
    with: {
      category: true,
      photos: { orderBy: [asc(photos.displayOrder)], limit: 1 },
    },
  });
}

/* ------------------------------ Projets -------------------------- */

/** Un projet publié par slug, avec sa galerie ordonnée. */
export async function getProjectBySlug(slug: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.slug, slug), eq(projects.published, true)),
    with: {
      category: true,
      photos: { orderBy: [asc(photos.displayOrder)] },
    },
  });
}

/** Slugs publiés — pour generateStaticParams / sitemap. */
export async function getPublishedSlugs() {
  return db
    .select({ slug: projects.slug, updatedAt: projects.updatedAt })
    .from(projects)
    .where(eq(projects.published, true));
}

/* ----------------------------- Réglages -------------------------- */

export async function getSettings() {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  return row ?? null;
}

/* ------------------------------ Admin ---------------------------- */

/** Tous les projets (publiés ou non) + miniature, pour l'admin. */
export async function getAllProjects() {
  return db.query.projects.findMany({
    orderBy: [asc(projects.displayOrder)],
    with: {
      category: true,
      photos: { orderBy: [asc(photos.displayOrder)], limit: 1 },
    },
  });
}

/** Un projet par id, avec toute sa galerie (édition admin). */
export async function getProjectById(id: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      category: true,
      photos: { orderBy: [asc(photos.displayOrder)] },
    },
  });
}

/** Photos seules d'une catégorie (admin — non filtré sur publication). */
export async function getCategoryPhotosAdmin(categoryId: string) {
  return getCategoryPhotos(categoryId);
}

/** Projets d'une catégorie (admin — publiés ou non) + miniature. */
export async function getCategoryProjectsAdmin(categoryId: string) {
  return db.query.projects.findMany({
    where: eq(projects.categoryId, categoryId),
    orderBy: [asc(projects.displayOrder)],
    with: {
      category: true,
      photos: { orderBy: [asc(photos.displayOrder)], limit: 1 },
    },
  });
}
