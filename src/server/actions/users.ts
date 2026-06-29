"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { requireAdmin, requireAdminRole } from "./guard";

const ROLES = ["admin", "editor"] as const;

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  role: z.enum(ROLES),
});

function newToken() {
  return randomBytes(32).toString("base64url");
}

/** Nombre d'administrateurs ACTIFS (mot de passe défini) — pour ne pas se verrouiller. */
async function activeAdminCount(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), isNotNull(users.passwordHash)));
  return Number(n);
}

/** Invite un utilisateur (sans mot de passe). Renvoie le jeton à transmettre. */
export async function inviteUser(raw: unknown) {
  await requireAdminRole();
  const data = inviteSchema.parse(raw);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (existing) throw new Error("Un utilisateur avec cet email existe déjà.");

  const inviteToken = newToken();
  const name =
    [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || null;
  const [row] = await db
    .insert(users)
    .values({
      email: data.email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      name,
      role: data.role,
      passwordHash: null, // défini par l'utilisateur à la 1re connexion
      inviteToken,
      invitedAt: new Date(),
    })
    .returning();

  revalidatePath("/admin/settings/users");
  return { id: row.id, email: row.email, inviteToken };
}

/** Régénère un lien d'invitation (utilisateur encore en attente). */
export async function regenerateInvite(id: string) {
  await requireAdminRole();
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) throw new Error("Utilisateur introuvable.");
  if (target.passwordHash) {
    throw new Error("Cet utilisateur a déjà activé son compte.");
  }
  const inviteToken = newToken();
  await db.update(users).set({ inviteToken }).where(eq(users.id, id));
  revalidatePath("/admin/settings/users");
  return { inviteToken };
}

/** Change le rôle d'un utilisateur (protège le dernier admin actif). */
export async function setUserRole(id: string, role: (typeof ROLES)[number]) {
  await requireAdminRole();
  z.enum(ROLES).parse(role);
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) throw new Error("Utilisateur introuvable.");
  if (
    target.role === "admin" &&
    role !== "admin" &&
    target.passwordHash &&
    (await activeAdminCount()) <= 1
  ) {
    throw new Error("Impossible : c'est le dernier administrateur actif.");
  }
  await db.update(users).set({ role }).where(eq(users.id, id));
  revalidatePath("/admin/settings/users");
}

/** Supprime un utilisateur (jamais soi-même ni le dernier admin actif). */
export async function deleteUser(id: string) {
  const me = await requireAdminRole();
  if (me.id === id) throw new Error("Vous ne pouvez pas vous supprimer.");
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return;
  if (
    target.role === "admin" &&
    target.passwordHash &&
    (await activeAdminCount()) <= 1
  ) {
    throw new Error("Impossible : c'est le dernier administrateur actif.");
  }
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/settings/users");
}

/** Profil de l'utilisateur connecté (prénom/nom). */
export async function updateMyProfile(raw: unknown) {
  const me = await requireAdmin();
  if (!me.id) throw new Error("Votre session a expiré. Reconnectez-vous.");
  const { firstName, lastName } = z
    .object({
      firstName: z.string().trim().max(60).optional(),
      lastName: z.string().trim().max(60).optional(),
    })
    .parse(raw);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  await db
    .update(users)
    .set({ firstName: firstName || null, lastName: lastName || null, name })
    .where(eq(users.id, me.id));
  revalidatePath("/admin/settings");
}

const setPwdSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "8 caractères minimum").max(200),
});

/** Définition du mot de passe via le jeton d'invitation (PAS d'auth : le jeton fait foi). */
export async function setPasswordFromInvite(raw: unknown) {
  const { token, password } = setPwdSchema.parse(raw);
  const target = await db.query.users.findFirst({
    where: and(eq(users.inviteToken, token), ne(users.email, "")),
  });
  if (!target) throw new Error("Lien d'invitation invalide ou déjà utilisé.");
  const passwordHash = await hash(password);
  await db
    .update(users)
    .set({ passwordHash, inviteToken: null })
    .where(eq(users.id, target.id));
  return { email: target.email };
}
