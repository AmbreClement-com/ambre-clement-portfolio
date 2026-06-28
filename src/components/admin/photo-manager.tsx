"use client";

import { useRef, useState, useTransition } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  deletePhoto,
  reorderPhotos,
  setCover,
  updatePhotoAlt,
} from "@/server/actions/photos";
import type { Photo } from "@/server/db/schema";

function thumb(photo: Photo) {
  return photo.variants.webp[0]?.url ?? photo.lqip ?? "";
}

// Redimensionnement CÔTÉ NAVIGATEUR avant l'upload : on n'envoie pas l'original
// pleine résolution (souvent 10-20 Mo) mais une version ~2560 px (~1 Mo). Comme la
// plus grande variante affichée fait 2400 px, l'affichage est STRICTEMENT identique,
// mais on transfère ~10× moins de données → upload de gros lots bien plus rapide.
// Décodage hors thread principal (createImageBitmap). Fallback : fichier d'origine si
// le format n'est pas décodable (ex. HEIC) ou en cas d'erreur.
const MAX_UPLOAD_DIM = 2560;
async function downscaleForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const max = Math.max(bitmap.width, bitmap.height);
    if (!max || max <= MAX_UPLOAD_DIM) {
      bitmap.close();
      return file; // déjà assez petite
    }
    const scale = MAX_UPLOAD_DIM / max;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.9),
    );
    if (!blob || blob.size >= file.size) return file; // pas de gain → garde l'original
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

type Props = {
  initial: Photo[];
  /** Cible : un projet… */
  projectId?: string;
  /** …ou une catégorie de type "photos" (galerie d'un onglet). */
  categoryId?: string;
};

export function PhotoManager({ initial, projectId, categoryId }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showCover = Boolean(projectId); // couverture = notion propre aux projets

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: list.length });

    // Ordre de départ = juste après la dernière photo existante. Chaque fichier porte
    // son ordre (startOrder + index) → upload PARALLÈLE sans course sur l'ordre.
    const startOrder =
      photos.reduce((m, p) => Math.max(m, p.displayOrder), -1) + 1;

    const skipped: string[] = [];
    let added = 0;
    let done = 0;
    let cursor = 0;
    const CONCURRENCY = 6; // 6 photos de front (redimension client + réseau + serveur)

    // Pool de workers : 1 requête = 1 photo → progression précise + pas de timeout 60s
    // sur les gros lots. Chaque photo est REDIMENSIONNÉE dans le navigateur avant l'envoi.
    async function worker() {
      while (cursor < list.length) {
        const i = cursor++;
        const file = list[i];
        try {
          const toSend = await downscaleForUpload(file); // ~10× moins de données
          const fd = new FormData();
          if (projectId) fd.set("projectId", projectId);
          if (categoryId) fd.set("categoryId", categoryId);
          fd.set("order", String(startOrder + i));
          fd.append("files", toSend);
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error();
          const data = (await res.json()) as {
            photos: Photo[];
            skipped: string[];
          };
          if (data.photos?.length) {
            added += data.photos.length;
            setPhotos((prev) =>
              [...prev, ...data.photos].sort(
                (a, b) => a.displayOrder - b.displayOrder,
              ),
            );
          }
          if (data.skipped?.length) skipped.push(...data.skipped);
        } catch {
          skipped.push(file.name);
        } finally {
          done++;
          setProgress({ done, total: list.length });
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker),
    );

    setUploading(false);
    setProgress(null);
    if (added) toast.success(`${added} photo(s) ajoutée(s)`);
    if (skipped.length) toast.warning(`Ignoré : ${skipped.join(", ")}`);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const next = arrayMove(photos, oldIndex, newIndex);
    setPhotos(next);
    reorderPhotos({ ids: next.map((p) => p.id) }).catch(() =>
      toast.error("Échec du réordonnancement"),
    );
  }

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors ${
          uploading ? "cursor-default" : "cursor-pointer"
        } ${dragOver ? "border-primary bg-muted" : "border-border"}`}
      >
        {uploading && progress ? (
          <div className="flex w-full max-w-xs flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Spinner className="size-5 text-primary" />
              <span className="tabular-nums">
                {progress.done} / {progress.total} photo(s) envoyée(s)
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="size-6" />
            Glissez des photos ici ou cliquez pour sélectionner
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, i) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  isCover={showCover && i === 0}
                  showCover={showCover}
                  onAltSaved={(alt) =>
                    setPhotos((prev) =>
                      prev.map((p) => (p.id === photo.id ? { ...p, altText: alt } : p)),
                    )
                  }
                  onDeleted={() =>
                    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                  }
                  onCover={() => {
                    if (!projectId) return;
                    setCover(projectId, photo.id).catch(() => toast.error("Erreur"));
                    setPhotos((prev) => [
                      photo,
                      ...prev.filter((p) => p.id !== photo.id),
                    ]);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortablePhoto({
  photo,
  isCover,
  showCover,
  onAltSaved,
  onDeleted,
  onCover,
}: {
  photo: Photo;
  isCover: boolean;
  showCover: boolean;
  onAltSaved: (alt: string) => void;
  onDeleted: () => void;
  onCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });
  const [alt, setAlt] = useState(photo.altText);
  const [, start] = useTransition();

  function saveAlt() {
    if (alt.trim() === photo.altText) return;
    if (!alt.trim()) {
      toast.error("Le texte alternatif est obligatoire");
      setAlt(photo.altText);
      return;
    }
    start(async () => {
      try {
        await updatePhotoAlt({ id: photo.id, altText: alt.trim() });
        onAltSaved(alt.trim());
        toast.success("Alt enregistré");
      } catch {
        toast.error("Erreur");
      }
    });
  }

  function remove() {
    if (!confirm("Supprimer cette photo ?")) return;
    start(async () => {
      try {
        await deletePhoto(photo.id);
        onDeleted();
      } catch {
        toast.error("Erreur");
      }
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative grid gap-2 rounded-lg border border-border p-2 ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb(photo)}
          alt={photo.altText}
          className="size-full object-cover"
          loading="lazy"
        />
        {isCover && <Badge className="absolute left-1 top-1">Couverture</Badge>}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute right-1 top-1 cursor-grab rounded bg-card/80 p-1"
          aria-label="Déplacer"
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      <Input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={saveAlt}
        placeholder="Texte alternatif (SEO)"
        className="h-8 text-xs"
      />

      <div className="flex justify-between">
        {showCover ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCover}
            disabled={isCover}
            title="Définir comme couverture"
          >
            <Star className="size-4" />
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" variant="ghost" size="sm" onClick={remove}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
