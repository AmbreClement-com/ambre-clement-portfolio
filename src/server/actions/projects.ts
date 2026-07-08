"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { nextDisplayOrder, uniqueSlug } from "@/server/db/helpers";
import { projectInput, reorderInput } from "@/lib/validators";
import { requireAdmin } from "./guard";
import { deleteAllPhotos } from "./photos";

/** Revalide TOUT après une mutation projet : la liste admin (`/admin/projects`) ET les
 *  surfaces publiques (cinéma `/[onglet]`, pages `/projects/[slug]`). Sans la partie
 *  admin, la liste restait en cache → « le projet ne se crée pas » (alors qu'il existe). */
function revalidateProjects() {
  revalidatePath("/", "layout");
}

export async function createProject(raw: unknown) {
  await requireAdmin();
  const data = projectInput.parse(raw);

  const displayOrder = await nextDisplayOrder(projects, projects.displayOrder);
  const slug = await uniqueSlug(projects, projects.slug, projects.id, data.slug);
  const [row] = await db
    .insert(projects)
    .values({
      title: data.title,
      slug,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      location: data.location ?? null,
      shotDate: data.shotDate ?? null,
      published: data.published,
      publishedAt: data.published ? new Date() : null,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      displayOrder,
    })
    .returning();

  revalidateProjects();
  return row;
}

export async function updateProject(id: string, raw: unknown) {
  await requireAdmin();
  const data = projectInput.parse(raw);

  // exclut le projet courant pour qu'il ne se considère pas en collision avec lui-même
  const slug = await uniqueSlug(projects, projects.slug, projects.id, data.slug, id);
  await db
    .update(projects)
    .set({
      title: data.title,
      slug,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      location: data.location ?? null,
      shotDate: data.shotDate ?? null,
      published: data.published,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  revalidateProjects();
}

export async function deleteProject(id: string) {
  await requireAdmin();
  // AVANT la suppression : la cascade DB efface les LIGNES photos mais pas les
  // FICHIERS du stockage → on supprime les photos explicitement, fichiers compris.
  await deleteAllPhotos({ projectId: id });
  await db.delete(projects).where(eq(projects.id, id));
  revalidateProjects();
}

export async function togglePublish(id: string, published: boolean) {
  await requireAdmin();
  await db
    .update(projects)
    .set({ published, publishedAt: published ? new Date() : null })
    .where(eq(projects.id, id));
  revalidateProjects();
}

/** Réordonne les projets : ordre du tableau = displayOrder. */
export async function reorderProjects(raw: unknown) {
  await requireAdmin();
  const { ids } = reorderInput.parse(raw);
  await Promise.all(
    ids.map((id, i) =>
      db.update(projects).set({ displayOrder: i }).where(eq(projects.id, id)),
    ),
  );
  revalidateProjects();
}
