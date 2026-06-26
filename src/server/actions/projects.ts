"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { projectInput, reorderInput } from "@/lib/validators";
import { requireAdmin } from "./guard";

export async function createProject(raw: unknown) {
  await requireAdmin();
  const data = projectInput.parse(raw);

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projects.displayOrder}), -1)` })
    .from(projects);

  const [row] = await db
    .insert(projects)
    .values({
      title: data.title,
      slug: data.slug,
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

  await db
    .update(projects)
    .set({
      title: data.title,
      slug: data.slug,
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
  revalidatePath(`/projects/${data.slug}`);
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
