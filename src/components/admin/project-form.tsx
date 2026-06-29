"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject, updateProject } from "@/server/actions/projects";
import { slugify } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { Project } from "@/server/db/schema";

type Props = {
  project?: Project;
  /** Onglet (catégorie) du projet — déterminé par le contexte de création, jamais choisi
   *  à la main : un projet appartient TOUJOURS à l'onglet d'où il a été créé. */
  categoryId: string | null;
};

export function ProjectForm({ project, categoryId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isEdit = Boolean(project);

  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [location, setLocation] = useState(project?.location ?? "");
  const [shotDate, setShotDate] = useState(project?.shotDate ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [published, setPublished] = useState(project?.published ?? false);
  const [seoTitle, setSeoTitle] = useState(project?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    project?.seoDescription ?? "",
  );

  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      slug,
      categoryId: categoryId || null,
      location: location || null,
      shotDate: shotDate || null,
      description: description || null,
      published,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    };
    start(async () => {
      try {
        if (isEdit && project) {
          await updateProject(project.id, payload);
          toast.success("Projet enregistré");
          router.refresh();
        } else {
          const row = await createProject(payload);
          toast.success("Projet créé");
          router.push(`/admin/projects/${row!.id}`);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Le projet n'a pas pu être enregistré. Réessayez.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" value={title} onChange={(e) => onTitle(e.target.value)} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
        />
        <p className="text-xs text-muted-foreground">/projects/{slug || "…"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Siargao, Philippines"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={shotDate}
            onChange={(e) => setShotDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="grid gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">SEO</legend>
        <div className="grid gap-2">
          <Label htmlFor="seoTitle">Titre SEO</Label>
          <Input
            id="seoTitle"
            value={seoTitle}
            maxLength={70}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seoDescription">Description SEO</Label>
          <Textarea
            id="seoDescription"
            rows={2}
            maxLength={160}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Switch id="published" checked={published} onCheckedChange={setPublished} />
        <Label htmlFor="published">Publié</Label>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le projet"}
        </Button>
      </div>
    </form>
  );
}
