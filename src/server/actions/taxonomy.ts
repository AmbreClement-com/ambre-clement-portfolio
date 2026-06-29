"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { nextDisplayOrder, uniqueSlug } from "@/server/db/helpers";
import { slugify, categoryInput, RESERVED_SLUGS } from "@/lib/validators";
import type { CategoryType } from "@/server/db/schema";
import { requireAdmin } from "./guard";

/** Revalide toute la surface publique (la nav et les onglets en dépendent). */
function revalidate() {
  revalidatePath("/", "layout");
}

function safeSlug(name: string) {
  const slug = slugify(name);
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error(`« ${name} » est réservé, choisissez un autre nom.`);
  }
  return slug;
}

/** Slug d'onglet UNIQUE (suffixe -2, -3… si déjà pris) → pas de crash sur doublon. */
const uniqueCategorySlug = (base: string, excludeId?: string) =>
  uniqueSlug(categories, categories.slug, categories.id, base, excludeId);

export async function createCategory(raw: unknown) {
  await requireAdmin();
  const { name, type } = categoryInput.parse(raw);
  const slug = await uniqueCategorySlug(safeSlug(name));
  const displayOrder = await nextDisplayOrder(categories, categories.displayOrder);
  const [row] = await db
    .insert(categories)
    .values({ name, slug, type, displayOrder })
    .returning();
  revalidate();
  return row;
}

export async function renameCategory(id: string, name: string) {
  await requireAdmin();
  const parsed = z.string().min(1).max(60).parse(name);
  const slug = await uniqueCategorySlug(safeSlug(parsed), id);
  await db
    .update(categories)
    .set({ name: parsed, slug })
    .where(eq(categories.id, id));
  revalidate();
}

export async function setCategoryType(id: string, type: CategoryType) {
  await requireAdmin();
  await db.update(categories).set({ type }).where(eq(categories.id, id));
  revalidate();
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await db.delete(categories).where(eq(categories.id, id));
  revalidate();
}

export async function reorderCategories(ids: string[]) {
  await requireAdmin();
  await Promise.all(
    ids.map((id, i) =>
      db.update(categories).set({ displayOrder: i }).where(eq(categories.id, id)),
    ),
  );
  revalidate();
}
