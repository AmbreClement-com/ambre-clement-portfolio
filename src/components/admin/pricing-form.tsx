"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, UploadCloud, X } from "lucide-react";
import { updatePricing } from "@/server/actions/pricing";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { PricingContent, StoredImage } from "@/server/db/schema";

export function PricingForm({ initial }: { initial: PricingContent }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [imgBusy, setImgBusy] = useState(false);

  const [published, setPublished] = useState(initial.published);
  const [navLabel, setNavLabel] = useState(initial.navLabel);
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [intro, setIntro] = useState(initial.intro);
  const [includes, setIncludes] = useState<string[]>(
    initial.includes.length ? initial.includes : [""],
  );
  const [price, setPrice] = useState(initial.price);
  const [image, setImage] = useState<StoredImage | null>(initial.image);

  async function onPickImage(file: File) {
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "L'image n'a pas pu être envoyée.");
      setImage(data.image as StoredImage);
      toast.success("Image ajoutée — n'oubliez pas d'enregistrer.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "L'image n'a pas pu être envoyée. Réessayez.",
      );
    } finally {
      setImgBusy(false);
    }
  }

  function save() {
    start(async () => {
      try {
        const res = await updatePricing({
          published,
          navLabel,
          title,
          subtitle,
          intro,
          includes,
          price,
          image,
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success(
          published
            ? "Page Tarifs enregistrée et publiée"
            : "Page Tarifs enregistrée (non publiée)",
        );
        router.refresh();
      } catch {
        toast.error("La page Tarifs n'a pas pu être enregistrée. Réessayez.");
      }
    });
  }

  const thumb = image?.variants.webp[0]?.url ?? image?.lqip ?? "";

  return (
    <div className="grid gap-6">
      {/* Publication */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="font-medium">Publier la page Tarifs</p>
          <p className="text-sm text-muted-foreground">
            Si activé, « {navLabel || "Tarifs"} » apparaît dans le menu du site et
            la page est accessible publiquement.
          </p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} />
      </div>

      {/* Image */}
      <div className="grid gap-2">
        <Label>Photo (affichée à gauche)</Label>
        <div className="flex items-start gap-4">
          {image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                className="h-40 w-32 rounded border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow ring-1 ring-border"
                aria-label="Retirer l'image"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-40 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
              {imgBusy ? (
                <Spinner className="size-5" />
              ) : (
                <>
                  <UploadCloud className="size-5" />
                  Choisir
                </>
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={imgBusy}
                onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>

      {/* Champs texte */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="navLabel">Libellé dans le menu</Label>
          <Input
            id="navLabel"
            value={navLabel}
            onChange={(e) => setNavLabel(e.target.value)}
            placeholder="Tarifs"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="price">Prix</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="À partir de 335 € TTC"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Photographie maternité"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="subtitle">Sous-titre</Label>
        <Input
          id="subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Grossesse, post-partum & allaitement"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="intro">Présentation</Label>
        <Textarea
          id="intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={6}
          placeholder="Votre texte… (une ligne vide sépare les paragraphes)"
        />
        <p className="text-xs text-muted-foreground">
          Laissez une ligne vide entre deux paragraphes.
        </p>
      </div>

      {/* Liste « La séance comprend » */}
      <div className="grid gap-2">
        <Label>« La séance comprend »</Label>
        <div className="grid gap-2">
          {includes.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setIncludes((arr) =>
                    arr.map((v, j) => (j === i ? e.target.value : v)),
                  )
                }
                placeholder="Ex. Séance d'environ 1 heure"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setIncludes((arr) =>
                    arr.length > 1 ? arr.filter((_, j) => j !== i) : arr,
                  )
                }
                aria-label="Retirer cette ligne"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIncludes((arr) => [...arr, ""])}
          >
            <Plus className="size-4" /> Ajouter une ligne
          </Button>
        </div>
      </div>

      <div>
        <Button onClick={save} disabled={pending || imgBusy}>
          {pending && <Spinner className="mr-2" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
