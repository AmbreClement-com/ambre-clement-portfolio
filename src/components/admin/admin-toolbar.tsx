"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Eye, Pencil, LayoutDashboard, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Me = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  theme?: string;
};

function editHref(path: string): string {
  if (path === "/") return "/admin/categories";
  if (path === "/contact" || path === "/mentions-legales") return "/admin/settings";
  if (path.startsWith("/projects/")) {
    return `/admin/projects/by-slug/${path.split("/")[2]}`;
  }
  const slug = path.split("/")[1];
  if (slug) return `/admin/categories/by-slug/${slug}`;
  return "/admin";
}

/**
 * Barre d'administration flottante (bas-centre), épurée. Visible uniquement
 * quand l'admin est connecté — l'identité est lue côté client via /api/me
 * (jamais figée dans le cache, et toujours à jour après modif du profil).
 */
export function AdminToolbar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const [shrunk, setShrunk] = useState(false);

  // Rétrécit la barre quand on défile vers le bas, la restaure en remontant
  // (façon Instagram). Écoute en CAPTURE : les pages galeries défilent dans des
  // conteneurs internes, pas seulement sur window.
  useEffect(() => {
    const lastPos = new WeakMap<Element, number>();
    let lastWin = window.scrollY;
    const onScroll = (e: Event) => {
      let y: number;
      let prev: number;
      if (e.target instanceof Element) {
        y = e.target.scrollTop;
        prev = lastPos.get(e.target) ?? y;
        lastPos.set(e.target, y);
      } else {
        y = window.scrollY;
        prev = lastWin;
        lastWin = y;
      }
      const delta = y - prev;
      if (Math.abs(delta) < 4) return; // ignore le bruit (rubber-band iOS…)
      if (y <= 24) {
        setShrunk(false); // en haut de page : toujours pleine taille
        return;
      }
      setShrunk(delta > 0);
    };
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setMe(d);
        if (d?.theme) setTheme(d.theme);
      })
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, [pathname]);

  // synchronisation instantanée quand le thème change dans les Réglages
  useEffect(() => {
    const onTheme = (e: Event) =>
      setTheme((e as CustomEvent<string>).detail);
    window.addEventListener("ac:theme", onTheme);
    return () => window.removeEventListener("ac:theme", onTheme);
  }, []);

  // Marque <html data-authed> quand un admin est connecté → sur mobile/tablette, la nav
  // prev/suivant du cadre remonte au-dessus de cette barre (cf. globals.css) pour ne pas
  // être recouverte par elle.
  useEffect(() => {
    if (!me) return;
    const el = document.documentElement;
    el.setAttribute("data-authed", "");
    return () => el.removeAttribute("data-authed");
  }, [me]);

  if (!me) return null;

  const isAdmin = pathname.startsWith("/admin");
  const initial = (me.firstName?.trim()?.[0] ?? me.email[0]).toUpperCase();
  const displayName = me.firstName
    ? `${me.firstName}${me.lastName ? " " + me.lastName : ""}`
    : me.email;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-50 flex justify-center px-4 print:hidden">
      <div
        data-theme={theme}
        className={cn(
          "glass-refract pointer-events-auto relative flex items-center gap-1.5 overflow-hidden rounded-full bg-white/18 p-1.5 text-neutral-900 shadow-[0_12px_40px_-6px_rgba(0,0,0,0.3)] ring-1 ring-white/40",
          // rebond élastique (easing « back ») ancré en bas, comme Instagram
          "origin-bottom transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
          shrunk && "scale-[0.85] hover:scale-100",
        )}
      >
        {/* reflet supérieur, touche « glass » */}
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        {/* Statut — desktop uniquement */}
        <span className="hidden items-center gap-2 pr-1 text-xs font-medium text-neutral-600 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {isAdmin ? "Édition" : "Aperçu"}
        </span>

        {isAdmin ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Eye className="size-4" /> Voir le site
          </Link>
        ) : (
          <Link
            href={editHref(pathname)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Pencil className="size-4" /> Modifier
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu du compte"
              className="flex size-8 items-center justify-center rounded-full bg-neutral-900/10 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-900/20 transition-colors hover:bg-neutral-900/20"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-theme={theme}
            side="top"
            align="end"
            sideOffset={10}
            className="w-60"
          >
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">Connecté en tant que</p>
              <p className="truncate text-sm font-medium">{displayName}</p>
            </div>
            <DropdownMenuSeparator />
            {!isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <LayoutDashboard className="size-4" /> Tableau de bord
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="size-4" /> Réglages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut({ callbackUrl: "/" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
