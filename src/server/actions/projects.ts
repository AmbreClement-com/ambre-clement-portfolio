"use server";

import { revalidatePath } from "next/cache";
import { and, eq, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { projectInput, reorderInput } from "@/lib/validators";
import { requireAdmin } from "./guard";

/** Garantit un slug UNIQUE : renvoie `base`, ou `base-2`, `base-3`… si déjà pris
 *  (en excluant éventuellement le projet courant). Évite le crash sur doublon. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const match = or(eq(projects.slug, base), like(projects.slug, `${base}-%`));
  const rows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(excludeId ? and(ne(projects.id, excludeId), match) : match);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function createProject(raw: unknown) {
  await requireAdmin();
  const data = projectInput.parse(raw);

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projects.displayOrder}), -1)` })
    .from(projects);

  const slug = await uniqueSlug(data.slug);
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
      displayOrder: Number(max) + 1,
    })
    .returning();

  revalidatePath("/projects");
  return row;
}

export async function updateProject(id: string, raw: unknown) {
  await requireAdmin();
  const data = projectInput.parse(raw);

  const slug = await uniqueSlug(data.slug, id); // exclut le projet courant
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

  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
}

export async function deleteProject(id: string) {
  await requireAdmin();
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
}

export async function togglePublish(id: string, published: boolean) {
  await requireAdmin();
  await db
    .update(projects)
    .set({ published, publishedAt: published ? new Date() : null })
    .where(eq(projects.id, id));
  revalidatePath("/projects");
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
  revalidatePath("/projects");
}
