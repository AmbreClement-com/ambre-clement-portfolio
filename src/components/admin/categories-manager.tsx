"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  FolderOpen,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  createCategory,
  renameCategory,
  setCategoryType,
  deleteCategory,
  reorderCategories,
} from "@/server/actions/taxonomy";
import type { CategoryType } from "@/server/db/schema";

type Cat = { id: string; name: string; type: CategoryType };

function TypeToggle({
  value,
  onChange,
}: {
  value: CategoryType;
  onChange: (t: CategoryType) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-border text-xs">
      {(["photos", "projects"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => value !== t && onChange(t)}
          className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
            value === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t === "photos" ? (
            <ImageIcon className="size-3" />
          ) : (
            <FolderOpen className="size-3" />
          )}
          {t === "photos" ? "Photos" : "Projets"}
        </button>
      ))}
    </div>
  );
}

export function CategoriesManager({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState<Cat[]>(initial);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("photos");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    start(async () => {
      try {
        const row = await createCategory({ name, type: newType });
        if (row) setCats((c) => [...c, { id: row.id, name: row.name, type: row.type }]);
        toast.success("Onglet créé");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  function changeType(id: string, type: CategoryType) {
    setCats((c) => c.map((x) => (x.id === id ? { ...x, type } : x)));
    run(() => setCategoryType(id, type));
  }

  function rename(id: string, name: string) {
    const v = name.trim();
    const cat = cats.find((c) => c.id === id);
    if (!v || !cat || v === cat.name) return;
    setCats((c) => c.map((x) => (x.id === id ? { ...x, name: v } : x)));
    run(() => renameCategory(id, v));
  }

  function remove(id: string, name: string) {
    if (!confirm(`Supprimer l'onglet « ${name} » et son contenu ?`)) return;
    setCats((c) => c.filter((x) => x.id !== id));
    run(() => deleteCategory(id), "Onglet supprimé");
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= cats.length) return;
    const next = [...cats];
    [next[index], next[target]] = [next[target], next[index]];
    setCats(next);
    run(() => reorderCategories(next.map((c) => c.id)));
  }

  return (
    <div className="grid gap-6">
      <form className="flex flex-wrap items-center gap-2" onSubmit={add}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du nouvel onglet (ex. Mariage)"
          className="w-64"
        />
        <TypeToggle value={newType} onChange={setNewType} />
        <Button
          type="submit"
          size="icon"
          aria-label="Créer l'onglet"
          disabled={pending}
        >
          {pending ? <Spinner className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Le 1ᵉʳ onglet est la page d&apos;accueil. Glissez l&apos;ordre avec les flèches.
      </p>

      <ul className="grid gap-2">
        {cats.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun onglet. Créez-en un pour démarrer.
          </li>
        )}
        {cats.map((c, i) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
          >
            {i === 0 && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Accueil
              </span>
            )}
            <Input
              defaultValue={c.name}
              onBlur={(e) => rename(c.id, e.target.value)}
              className="h-8 w-44 border-transparent shadow-none hover:border-border focus-visible:border-input"
            />
            <TypeToggle value={c.type} onChange={(t) => changeType(c.id, t)} />

            <div className="ml-auto flex items-center gap-1">
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href={`/admin/categories/${c.id}`}>
                  <Settings2 className="size-4" /> Gérer
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Monter"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => move(i, 1)}
                disabled={i === cats.length - 1}
                aria-label="Descendre"
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => remove(c.id, c.name)}
                aria-label="Supprimer"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
