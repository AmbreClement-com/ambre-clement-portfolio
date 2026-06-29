"use server";

import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { revalidatePath } from "next/cache";
import { changePasswordInput, profileInput } from "@/lib/validators";
import { requireAdmin } from "./guard";

export async function updateProfile(raw: unknown) {
  const sessionUser = await requireAdmin();
  const { firstName, lastName } = profileInput.parse(raw);
  const email = sessionUser.email;
  if (!email) throw new Error("Votre session a expiré. Reconnectez-vous.");

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
  await db
    .update(users)
    .set({
      firstName: firstName || null,
      lastName: lastName || null,
      name: fullName,
    })
    .where(eq(users.email, email));
  revalidatePath("/admin");
}

/**
 * Renvoie un résultat (et NE lance PAS) pour les erreurs « métier » destinées à
 * l'utilisateur : en production, Next.js masque les messages des erreurs `throw`
 * des Server Actions. Le `return { error }` traverse correctement la frontière.
 */
export async function changePassword(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  const sessionUser = await requireAdmin();
  const { currentPassword, newPassword } = changePasswordInput.parse(raw);

  const email = sessionUser.email;
  if (!email) return { error: "Votre session a expiré. Reconnectez-vous." };

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return { error: "Compte introuvable. Reconnectez-vous." };
  if (!user.passwordHash)
    return { error: "Votre compte n'est pas encore activé." };

  const ok = await verify(user.passwordHash, currentPassword);
  if (!ok) return { error: "Le mot de passe actuel est incorrect." };

  const passwordHash = await hash(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  return { ok: true };
}
