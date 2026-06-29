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

export async function changePassword(raw: unknown) {
  const sessionUser = await requireAdmin();
  const { currentPassword, newPassword } = changePasswordInput.parse(raw);

  const email = sessionUser.email;
  if (!email) throw new Error("Votre session a expiré. Reconnectez-vous.");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new Error("Utilisateur introuvable");
  if (!user.passwordHash) throw new Error("Compte non activé");

  const ok = await verify(user.passwordHash, currentPassword);
  if (!ok) throw new Error("Mot de passe actuel incorrect");

  const passwordHash = await hash(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
}
