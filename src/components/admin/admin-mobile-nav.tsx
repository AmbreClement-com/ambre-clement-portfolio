"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminNav } from "./admin-nav";

type NavCategory = { id: string; name: string; type: string };
type NavProject = { id: string; title: string; categoryId: string | null };

type Props = {
  role?: string;
  categories?: NavCategory[];
  projects?: NavProject[];
  tarifs?: { id: string; title: string }[];
};

/**
 * Navigation admin sur MOBILE (< lg) : barre supérieure avec un bouton hamburger
 * ouvrant un tiroir latéral qui réutilise <AdminNav>. Sur desktop (lg+), tout est
 * masqué (`lg:hidden`) — c'est la sidebar fixe du layout qui prend le relais.
 */
export function AdminMobileNav(props: Props) {
  const [open, setOpen] = useState(false);

  // Ferme le tiroir quand la route change — ajustement d'état PENDANT le rendu
  // (patron React officiel), donc pas de setState dans un effet.
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Bloque le défilement de la page tant que le tiroir est ouvert.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    // STICKY sur CE wrapper (enfant direct du layout, pleine hauteur de page) :
    // posé sur la barre interne, le sticky était neutralisé — son parent (ce div)
    // ne faisait que la hauteur de la barre, elle ne pouvait pas « coller ».
    <div className="sticky top-0 z-40 md:hidden">
      {/* Barre supérieure mobile */}
      <div className="flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="-ml-1 rounded-md p-1.5 text-foreground hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="size-2 rounded-full bg-primary" />
          Administration
        </p>
      </div>

      {/* Tiroir + voile */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <p className="flex items-center gap-2 px-2 text-sm font-semibold tracking-wide">
                <span className="size-2 rounded-full bg-primary" />
                Administration
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <AdminNav {...props} />
          </div>
        </div>
      )}
    </div>
  );
}
