"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, UploadCloud, X } from "lucide-react";
import { createPricing, updatePricing } from "@/server/actions/pricing";
import { downscaleForUpload } from "@/lib/downscale-image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { Pricing, StoredImage } from "@/server/db/schema";

export function PricingForm({ pricing }: { pricing?: Pricing | null }) {
  const router = useRouter();
  const isEdit = Boolean(pricing);
  const [pending, start] = useTransition();
  const [imgBusy, setImgBusy] = useState(false);

  const [published, setPublished] = useState(pricing?.published ?? false);
  const [title, setTitle] = useState(pricing?.title ?? "");
  const [subtitle, setSubtitle] = useState(pricing?.subtitle ?? "");
  const [intro, setIntro] = useState(pricing?.intro ?? "");
  const [includes, setIncludes] = useState<string[]>(
    pricing?.includes?.length ? pricing.includes : [""],
  );
  const [price, setPrice] = useState(pricing?.price ?? "");
  const [image, setImage] = useState<StoredImage | null>(pricing?.image ?? null);

  async function onPickImage(file: File) {
    setImgBusy(true);
    try {
      const fd = new FormData();
      // Redimensionne côté navigateur (≤2560 px) avant l'envoi : même rendu, mais
      // on n'envoie pas l'original plein format (rapidité + fiabilité serveur).
      fd.append("file", await downscaleForUpload(file));
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
    const payload = { published, title, subtitle, intro, includes, price, image };
    start(async () => {
      try {
        if (isEdit && pricing) {
          const res = await updatePricing(pricing.id, payload);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Tarif enregistré");
          router.refresh();
        } else {
          const res = await createPricing(payload);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Tarif créé");
          router.push(`/admin/tarifs/${res.id}`);
        }
      } catch {
        toast.error("Le tarif n'a pas pu être enregistré. Réessayez.");
      }
    });
  }

  const thumb = image?.variants.webp[0]?.url ?? image?.lqip ?? "";

  return (
    <div className="grid gap-6">
      {/* Publication du tarif */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="font-medium">Publier ce tarif</p>
          <p className="text-sm text-muted-foreground">
            Visible sur la page Tarifs du site. En brouillon, il reste caché.
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

      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="price">Prix</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="À partir de 335 € TTC"
          />
          <p className="text-xs text-muted-foreground">
            Texte libre, affiché tel quel (ex. « 335 € TTC », « Sur devis »).
          </p>
        </div>
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
                  setIncludes((arr) => arr.filter((_, j) => j !== i))
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
          {isEdit ? "Enregistrer" : "Créer le tarif"}
        </Button>
      </div>
    </div>
  );
}
