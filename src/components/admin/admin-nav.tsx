"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Wrench,
  FolderOpen,
  Images,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavCategory = { id: string; name: string; type: string };
type NavProject = { id: string; title: string };

function itemClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
    active
      ? "bg-primary/10 font-medium text-primary"
      : "text-foreground hover:bg-muted",
  );
}

/** Section dépliable : un lien-titre + un chevron qui révèle des sous-liens. */
function Collapsible({
  href,
  label,
  icon: Icon,
  active,
  open,
  onToggle,
  children,
  hasChildren,
}: {
  href: string;
  label: string;
  icon: typeof Layers;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasChildren: boolean;
}) {
  return (
    <div>
      <div className={cn("flex items-center", itemClass(active), "pr-0")}>
        <Link href={href} className="flex flex-1 items-center gap-2">
          <Icon className={cn("size-4", active && "text-primary")} />
          {label}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Replier" : "Déplier"}
            aria-expanded={open}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", open && "rotate-90")}
            />
          </button>
        )}
      </div>
      {open && hasChildren && (
        <div className="mt-0.5 grid gap-0.5 border-l border-border pl-3 ml-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AdminNav({
  role,
  isDev,
  categories = [],
  projects = [],
}: {
  role?: string;
  isDev?: boolean;
  categories?: NavCategory[];
  projects?: NavProject[];
}) {
  const pathname = usePathname();
  const ongletsActive = pathname.startsWith("/admin/categories");
  const projetsActive = pathname.startsWith("/admin/projects");
  // Sections ouvertes par défaut si on est dans une de leurs pages.
  const [openOnglets, setOpenOnglets] = useState(ongletsActive);
  const [openProjets, setOpenProjets] = useState(projetsActive);

  const subLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "truncate rounded-md px-2 py-1.5 text-sm transition-colors",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        title={label}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      <Link href="/admin" className={itemClass(pathname === "/admin")}>
        <LayoutDashboard
          className={cn("size-4", pathname === "/admin" && "text-primary")}
        />
        Dashboard
      </Link>

      <Collapsible
        href="/admin/categories"
        label="Onglets"
        icon={Layers}
        active={ongletsActive}
        open={openOnglets}
        onToggle={() => setOpenOnglets((v) => !v)}
        hasChildren={categories.length > 0}
      >
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            {c.type === "photos" ? (
              <Images className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Layers className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              {subLink(`/admin/categories/${c.id}`, c.name)}
            </div>
          </div>
        ))}
      </Collapsible>

      <Collapsible
        href="/admin/projects"
        label="Projets"
        icon={FolderOpen}
        active={projetsActive}
        open={openProjets}
        onToggle={() => setOpenProjets((v) => !v)}
        hasChildren={projects.length > 0}
      >
        {projects.map((p) => (
          <div key={p.id} className="min-w-0">
            {subLink(`/admin/projects/${p.id}`, p.title)}
          </div>
        ))}
      </Collapsible>

      <Link
        href="/admin/settings"
        className={itemClass(pathname === "/admin/settings")}
      >
        <Settings
          className={cn(
            "size-4",
            pathname === "/admin/settings" && "text-primary",
          )}
        />
        Réglages
      </Link>

      {role === "admin" && (
        <Link
          href="/admin/settings/users"
          className={itemClass(pathname.startsWith("/admin/settings/users"))}
        >
          <Users
            className={cn(
              "size-4",
              pathname.startsWith("/admin/settings/users") && "text-primary",
            )}
          />
          Utilisateurs
        </Link>
      )}

      {isDev && role === "admin" && (
        <Link
          href="/admin/settings/dev"
          className={itemClass(pathname.startsWith("/admin/settings/dev"))}
        >
          <Wrench
            className={cn(
              "size-4",
              pathname.startsWith("/admin/settings/dev") && "text-primary",
            )}
          />
          Développeur
        </Link>
      )}
    </nav>
  );
}
