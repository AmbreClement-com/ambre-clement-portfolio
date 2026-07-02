import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Bouton « Retour » : remonte la HIÉRARCHIE (page parente passée en `href`),
 * jamais l'historique du navigateur — `router.back()` ramenait à la « dernière
 * position » (parfois une tout autre section), déroutant dans un back-office.
 */
export function BackButton({
  href = "/admin",
  label = "Retour",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}
