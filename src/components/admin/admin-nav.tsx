"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const BASE_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/categories", label: "Onglets", icon: Layers },
  { href: "/admin/settings", label: "Réglages", icon: Settings, exact: true },
];

export function AdminNav({
  role,
  isDev,
}: {
  role?: string;
  isDev?: boolean;
}) {
  const pathname = usePathname();

  const links: NavLink[] = [...BASE_LINKS];
  // Gestion des utilisateurs : administrateurs uniquement.
  if (role === "admin") {
    links.push({
      href: "/admin/settings/users",
      label: "Utilisateurs",
      icon: Users,
    });
  }
  // Outils développeur : uniquement hors production, administrateurs.
  if (isDev && role === "admin") {
    links.push({
      href: "/admin/settings/dev",
      label: "Développeur",
      icon: Wrench,
    });
  }

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-foreground hover:bg-muted",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
