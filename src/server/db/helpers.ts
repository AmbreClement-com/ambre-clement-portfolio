import { and, eq, like, ne, or, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from ".";

/** Prochain `displayOrder` d'une table : max actuel + 1, ou 0 si la table est vide. */
export async function nextDisplayOrder(
  table: PgTable,
  orderColumn: PgColumn,
): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${orderColumn}), -1)` })
    .from(table);
  return Number(max) + 1;
}

/**
 * Renvoie un slug UNIQUE : `base`, ou `base-2`, `base-3`… si déjà pris (en excluant
 * éventuellement la ligne courante via `excludeId`). Évite le crash sur doublon.
 */
export async function uniqueSlug(
  table: PgTable,
  slugColumn: PgColumn,
  idColumn: PgColumn,
  base: string,
  excludeId?: string,
): Promise<string> {
  const match = or(eq(slugColumn, base), like(slugColumn, `${base}-%`));
  const rows = await db
    .select({ slug: slugColumn })
    .from(table)
    .where(excludeId ? and(ne(idColumn, excludeId), match) : match);
  const taken = new Set(rows.map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
