"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  projects,
  photos,
  projectTags,
  categories,
  users,
} from "@/server/db/schema";
import { requireAdminRole, assertDev } from "./guard";

async function count(table: PgTable) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(table);
  return Number(n);
}

/** Statistiques de la base (dev). */
export async function devStats() {
  assertDev();
  await requireAdminRole();
  const url = process.env.DATABASE_URL || "";
  const host = url ? (url.match(/@([^/]+)/)?.[1] ?? "?") : "PGlite local";
  return {
    host,
    projects: await count(projects),
    photos: await count(photos),
    categories: await count(categories),
    users: await count(users),
  };
}

/** Vide TOUT le contenu (projets + photos) en gardant onglets, réglages et comptes.
 *  Dev uniquement. Les fichiers Blob ne sont pas supprimés (orphelins inoffensifs). */
export async function clearContent() {
  assertDev();
  await requireAdminRole();
  await db.delete(projectTags);
  await db.delete(photos);
  await db.delete(projects);
  revalidatePath("/", "layout");
}
