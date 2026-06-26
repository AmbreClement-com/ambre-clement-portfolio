"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { visits } from "@/server/db/schema";
import { requireAdmin } from "./guard";

/** Efface toutes les visites enregistrées (remise à zéro du tableau de bord). */
export async function resetAnalytics() {
  await requireAdmin();
  await db.delete(visits);
  revalidatePath("/admin");
}
