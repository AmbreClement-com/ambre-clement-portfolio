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
        className="pointer-events-auto relative flex items-center gap-1.5 overflow-hidden rounded-full border border-border bg-card/55 p-1.5 pl-3 text-foreground shadow-[0_12px_40px_-6px_rgba(0,0,0,0.3)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-[1.8]"
      >
        {/* reflet supérieur, touche « glass » */}
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <span className="hidden items-center gap-2 pr-1 text-xs font-medium text-muted-foreground sm:flex">
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
              className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/20"
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
