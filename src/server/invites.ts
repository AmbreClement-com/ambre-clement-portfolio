import "server-only";

/**
 * Durée de validité d'un lien d'invitation. Passé ce délai, le lien est refusé
 * et un administrateur doit en régénérer un (bouton « régénérer » du menu
 * Utilisateurs). Module séparé (PAS "use server") : importable par la page
 * set-password ET par les actions serveur.
 */
export const INVITE_TTL_DAYS = 7;

/** Un lien est expiré si l'invitation date de plus de INVITE_TTL_DAYS.
 *  `invitedAt` absent (anciennes lignes) = pas d'expiration (on ne sait pas dater). */
export function inviteExpired(invitedAt: Date | null | undefined): boolean {
  if (!invitedAt) return false;
  return Date.now() - invitedAt.getTime() > INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
}
