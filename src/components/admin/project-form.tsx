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
        <Label htmlFor="title">Titre du projet</Label>
        <Input id="title" value={title} onChange={(e) => onTitle(e.target.value)} required />
        <p className="text-xs text-muted-foreground">
          Le nom affiché sur le site (ex. « Mariage à Dinard »).
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Adresse de la page (slug)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
        />
        <p className="text-xs text-muted-foreground">
          La fin de l&apos;adresse web de ce projet. Générée automatiquement à partir du
          titre — à modifier seulement si besoin. Uniquement des minuscules, des
          chiffres et des tirets. Adresse :{" "}
          <span className="font-mono">/projects/{slug || "…"}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="location">Lieu (facultatif)</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Siargao, Philippines"
          />
          <p className="text-xs text-muted-foreground">
            Affiché sur la page du projet.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Date (facultatif)</Label>
          <Input
            id="date"
            type="date"
            value={shotDate}
            onChange={(e) => setShotDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Date de la prise de vue.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description (facultatif)</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Quelques mots de présentation du projet.
        </p>
      </div>

      <fieldset className="grid gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">
          Référencement Google (SEO)
        </legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Comment ce projet apparaît dans les résultats de recherche Google.
          Facultatif : si vous laissez vide, le titre et la description du projet
          sont utilisés automatiquement.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="seoTitle">Titre dans Google</Label>
          <Input
            id="seoTitle"
            value={seoTitle}
            maxLength={70}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Mariage à Dinard — Ambre Clément"
          />
          <p className="text-xs text-muted-foreground">
            Le titre cliquable affiché dans Google. Idéalement 50–60 caractères.
            {seoTitle && ` (${seoTitle.length}/70)`}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seoDescription">Description dans Google</Label>
          <Textarea
            id="seoDescription"
            rows={2}
            maxLength={160}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Reportage photo d'un mariage intime à Dinard, en lumière naturelle…"
          />
          <p className="text-xs text-muted-foreground">
            Le petit texte affiché sous le titre dans Google. Donnez envie de
            cliquer. Idéalement 120–155 caractères.
            {seoDescription && ` (${seoDescription.length}/160)`}
          </p>
        </div>
      </fieldset>

      <div className="flex items-start gap-3">
        <Switch id="published" checked={published} onCheckedChange={setPublished} />
        <div className="grid gap-0.5">
          <Label htmlFor="published">Publié</Label>
          <p className="text-xs text-muted-foreground">
            Activé : visible par tous sur le site. Désactivé (brouillon) : visible
            seulement par vous dans l&apos;administration.
          </p>
        </div>
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
