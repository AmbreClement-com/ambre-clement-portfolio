import { cn } from "@/lib/utils";

/**
 * Rangée d'enregistrement STICKY : le bouton reste visible au bas de la fenêtre
 * tant que son bloc est à l'écran, puis reprend sa place naturelle en fin de
 * bloc. Fond opaque : le contenu défile DESSOUS, pas à travers.
 *
 * `inCard` (défaut) : pleine largeur de la carte (-mx/-mb compensent les
 * paddings, spacing par défaut = 4) — la CARTE HÔTE doit être en
 * `overflow-visible` (l'overflow-hidden par défaut désactive position:sticky).
 * `inCard={false}` : formulaire posé directement sur la page (ex. tarifs).
 */
export function SaveBar({
  children,
  inCard = true,
}: {
  children: React.ReactNode;
  inCard?: boolean;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 border-t border-border/60 py-3",
        inCard
          ? "-mx-4 -mb-4 rounded-b-xl bg-card px-4"
          : "bg-background",
      )}
    >
      {children}
    </div>
  );
}
