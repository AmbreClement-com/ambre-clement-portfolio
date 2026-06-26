import "server-only";
import { auth } from "@/server/auth";

/** Garde commune : toute action admin vérifie la session (defense in depth). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");
  return session.user;
}
