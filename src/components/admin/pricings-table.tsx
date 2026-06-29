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
  deletePricing,
  reorderPricings,
  togglePricingPublished,
} from "@/server/actions/pricing";
import type { Pricing } from "@/server/db/schema";

export function PricingsTable({ initial }: { initial: Pricing[] }) {
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
    reorderPricings(next.map((r) => r.id)).catch(() =>
      toast.error("Le nouvel ordre n'a pas pu être enregistré. Réessayez."),
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Aucun tarif. Créez-en un pour commencer.
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

function Row({ row, onDeleted }: { row: Pricing; onDeleted: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const [published, setPublished] = useState(row.published);
  const thumb = row.image?.variants.webp[0]?.url ?? row.image?.lqip ?? "";

  function toggle(v: boolean) {
    setPublished(v);
    togglePricingPublished(row.id, v).catch(() => {
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
        `Supprimer le tarif « ${row.title} » ? Cette action est définitive.`,
      )
    )
      return;
    deletePricing(row.id)
      .then(onDeleted)
      .catch(() => toast.error("Le tarif n'a pas pu être supprimé. Réessayez."));
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border border-border bg-card p-2 ${
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

      <div className="size-12 shrink-0 overflow-hidden rounded bg-muted">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {row.price || "Prix non renseigné"}
        </p>
      </div>

      {!published && <Badge variant="secondary">Brouillon</Badge>}

      <div className="flex items-center gap-1.5 px-2">
        <Switch checked={published} onCheckedChange={toggle} aria-label="Publier" />
      </div>

      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/tarifs/${row.id}`}>
          <Pencil className="size-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={remove}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
