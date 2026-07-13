"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteProject,
  reorderProjects,
  togglePublish,
} from "@/server/actions/projects";
import type { Photo, Project, Category } from "@/server/db/schema";

export type ProjectRow = Project & {
  category: Category | null;
  photos: Photo[];
};

export function ProjectsTable({ initial }: { initial: ProjectRow[] }) {
  const [rows, setRows] = useState(initial);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      rows,
      rows.findIndex((r) => r.id === active.id),
      rows.findIndex((r) => r.id === over.id),
    );
    setRows(next);
    reorderProjects({ ids: next.map((r) => r.id) }).catch(() =>
      toast.error("Le nouvel ordre n'a pas pu être enregistré. Réessayez."),
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Aucun projet. Créez-en un pour commencer.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-2">
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              onDeleted={() => setRows((p) => p.filter((r) => r.id !== row.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({ row, onDeleted }: { row: ProjectRow; onDeleted: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const [published, setPublished] = useState(row.published);
  const cover = row.photos[0];

  function toggle(v: boolean) {
    setPublished(v);
    togglePublish(row.id, v).catch(() => {
      setPublished(!v);
      toast.error(
        v
          ? "La publication a échoué. Réessayez."
          : "Le passage en brouillon a échoué. Réessayez.",
      );
    });
  }

  function remove() {
    if (
      !confirm(
        `Supprimer le projet « ${row.title} » et toutes ses photos ? Cette action est définitive.`,
      )
    )
      return;
    deleteProject(row.id)
      .then(onDeleted)
      .catch(() => toast.error("Le projet n'a pas pu être supprimé. Réessayez."));
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // min-w-0 : SANS lui, la rangée (item de grid, min-width:auto) impose sa
      // largeur intrinsèque (titre nowrap compris) à la colonne → boutons rognés
      // par l'overflow-hidden de la carte sur mobile. Avec lui, la rangée se cale
      // sur la carte et le titre tronque. gap réduit < sm : tout tient sur 320 px.
      className={`flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-2 sm:gap-3 ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
        aria-label="Déplacer"
      >
        <GripVertical className="size-4" />
      </button>

      <div className="size-10 shrink-0 overflow-hidden rounded bg-muted sm:size-12">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.variants.webp[0]?.url ?? cover.lqip ?? ""}
            alt=""
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {row.category?.name ?? "Sans catégorie"} · {row.photos.length} photo(s)
        </p>
      </div>

      {/* Badge masqué < sm (le switch montre déjà l'état) → place au titre. */}
      {!published && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Brouillon
        </Badge>
      )}

      <div className="flex items-center gap-1.5 sm:px-2">
        <Switch checked={published} onCheckedChange={toggle} aria-label="Publier" />
      </div>

      <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
        <Link href={`/admin/projects/${row.id}`}>
          <Pencil className="size-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={remove} className="px-2 sm:px-3">
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
