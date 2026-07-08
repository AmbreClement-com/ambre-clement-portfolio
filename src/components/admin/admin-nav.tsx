"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Images,
  FolderOpen,
  Tag,
  AtSign,
  ChevronRight,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavCategory = { id: string; name: string; type: string };
type NavProject = { id: string; title: string; categoryId: string | null };

function itemClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
    active
      ? "bg-primary/10 font-medium text-primary"
      : "text-foreground hover:bg-muted",
  );
}

/** Lien + chevron de dépliage (le clic sur le libellé navigue, le chevron déplie). */
function Row({
  href,
  label,
  icon: Icon,
  active,
  expandable,
  open,
  onToggle,
  small,
}: {
  href: string;
  label: string;
  icon: typeof Layers;
  active: boolean;
  expandable: boolean;
  open?: boolean;
  onToggle?: () => void;
  small?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center", itemClass(active), small && "py-1.5 text-sm")}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
        <span className="truncate">{label}</span>
      </Link>
      {expandable && (
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
  );
}

export function AdminNav({
  role,
  categories = [],
  projects = [],
  tarifs = [],
}: {
  role?: string;
  categories?: NavCategory[];
  projects?: NavProject[];
  tarifs?: { id: string; title: string }[];
}) {
  const pathname = usePathname();
  const ongletsActive =
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/projects") ||
    pathname.startsWith("/admin/tarifs");

  // Projet en cours d'édition (pour auto-déplier son onglet).
  const curProjectId =
    pathname.match(/^\/admin\/projects\/([^/]+)/)?.[1] ?? null;
  const projectsByCat = new Map<string, NavProject[]>();
  for (const p of projects) {
    if (!p.categoryId) continue;
    const arr = projectsByCat.get(p.categoryId) ?? [];
    arr.push(p);
    projectsByCat.set(p.categoryId, arr);
  }

  const [openOnglets, setOpenOnglets] = useState(ongletsActive);
  // Onglets « projets » dépliés : ouvre celui qui contient le projet édité.
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (curProjectId) {
      for (const [catId, list] of projectsByCat) {
        if (list.some((p) => p.id === curProjectId)) init[catId] = true;
      }
    }
    return init;
  });
  const toggleCat = (id: string) =>
    setOpenCats((s) => ({ ...s, [id]: !s[id] }));
  const [openTarifs, setOpenTarifs] = useState(
    pathname.startsWith("/admin/tarifs"),
  );

  return (
    <nav className="flex flex-col gap-1">
      <Link href="/admin" className={itemClass(pathname === "/admin")}>
        <LayoutDashboard
          className={cn("size-4", pathname === "/admin" && "text-primary")}
        />
        Dashboard
      </Link>

      {/* Onglets : contient TOUT (galeries + onglets projets, ces derniers dépliables). */}
      <Row
        href="/admin/categories"
        label="Onglets"
        icon={Layers}
        active={ongletsActive}
        expandable
        open={openOnglets}
        onToggle={() => setOpenOnglets((v) => !v)}
      />
      {openOnglets && (
        <div className="ml-3 grid grid-cols-1 gap-0.5 border-l border-border pl-3">
          {categories.map((c) => {
            const catActive = pathname === `/admin/categories/${c.id}`;
            if (c.type !== "projects") {
              // Galerie photos → simple lien.
              return (
                <Row
                  key={c.id}
                  href={`/admin/categories/${c.id}`}
                  label={c.name}
                  icon={Images}
                  active={catActive}
                  expandable={false}
                  small
                />
              );
            }
            // Onglet « projets » → dépliable pour montrer ses projets.
            const list = projectsByCat.get(c.id) ?? [];
            const open = openCats[c.id] ?? false;
            return (
              <div key={c.id}>
                <Row
                  href={`/admin/categories/${c.id}`}
                  label={c.name}
                  icon={Layers}
                  active={catActive}
                  expandable={list.length > 0}
                  open={open}
                  onToggle={() => toggleCat(c.id)}
                  small
                />
                {open && list.length > 0 && (
                  <div className="ml-3 grid grid-cols-1 gap-0.5 border-l border-border pl-3">
                    {list.map((p) => (
                      <Row
                        key={p.id}
                        href={`/admin/projects/${p.id}`}
                        label={p.title}
                        icon={FolderOpen}
                        active={pathname === `/admin/projects/${p.id}`}
                        expandable={false}
                        small
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Onglet « Tarifs » (dépliable pour montrer les tarifs) */}
          <div>
            <Row
              href="/admin/tarifs"
              label="Tarifs"
              icon={Tag}
              active={pathname === "/admin/tarifs"}
              expandable={tarifs.length > 0}
              open={openTarifs}
              onToggle={() => setOpenTarifs((v) => !v)}
              small
            />
            {openTarifs && tarifs.length > 0 && (
              <div className="ml-3 grid grid-cols-1 gap-0.5 border-l border-border pl-3">
                {tarifs.map((t) => (
                  <Row
                    key={t.id}
                    href={`/admin/tarifs/${t.id}`}
                    label={t.title}
                    icon={Tag}
                    active={pathname === `/admin/tarifs/${t.id}`}
                    expandable={false}
                    small
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Contact — toujours présent (coordonnées + page publique /contact). */}
      <Link
        href="/admin/contact"
        className={itemClass(pathname === "/admin/contact")}
      >
        <AtSign
          className={cn(
            "size-4",
            pathname === "/admin/contact" && "text-primary",
          )}
        />
        Contact
      </Link>

      {/* Système : santé technique (Web Vitals, base de données, services). */}
      <Link
        href="/admin/systeme"
        className={itemClass(pathname === "/admin/systeme")}
      >
        <HeartPulse
          className={cn(
            "size-4",
            pathname === "/admin/systeme" && "text-primary",
          )}
        />
        Système
      </Link>

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

    </nav>
  );
}
