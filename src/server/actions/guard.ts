import "server-only";
import { auth } from "@/server/auth";

/** Garde commune : toute action back-office vérifie la session (admin OU éditeur). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user)
    throw new Error("Votre session a expiré. Reconnectez-vous puis réessayez.");
  return session.user;
}

/** Garde renforcée : réservé au rôle "admin" (gestion des utilisateurs, outils dev). */
export async function requireAdminRole() {
  const user = await requireAdmin();
  if (user.role !== "admin")
    throw new Error("Cette action est réservée aux administrateurs.");
  return user;
}

/** Outils développeur : interdits en production. */
export function assertDev() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Indisponible en production");
  }
}
