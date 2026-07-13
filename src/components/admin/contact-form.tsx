"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus, ImageUp } from "lucide-react";
import { updateContact, clearContactImage } from "@/server/actions/settings";
import { downscaleForUpload } from "@/lib/downscale-image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SaveBar } from "@/components/admin/save-bar";
import { SOCIAL_PLATFORMS, SOCIAL_META } from "@/lib/social-platforms";
import { SOCIAL_ICONS } from "@/lib/socials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { StoredImage } from "@/server/db/schema";

type Social = { platform: string; url: string };
type ContactSettings = {
  email: string | null;
  contactTitle?: string | null;
  contactText: string | null;
  contactPhone?: string | null;
  contactLocation?: string | null;
  contactImage?: StoredImage | null;
  socials?: Social[] | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
};

const normalizeUrl = (u: string) => {
  const v = u.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

/** Onglet Contact : coordonnées + contenu de la page publique /contact. */
export function ContactForm({ settings }: { settings: ContactSettings | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    email: settings?.email ?? "",
    contactTitle: settings?.contactTitle ?? "",
    contactText: settings?.contactText ?? "",
    contactPhone: settings?.contactPhone ?? "",
    contactLocation: settings?.contactLocation ?? "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Réseaux sociaux (repli sur les anciens champs legacy tant que la liste est vide).
  const initialSocials: Social[] =
    settings?.socials && settings.socials.length > 0
      ? settings.socials
      : [
          ...(settings?.instagramUrl
            ? [{ platform: "instagram", url: settings.instagramUrl }]
            : []),
          ...(settings?.linkedinUrl
            ? [{ platform: "linkedin", url: settings.linkedinUrl }]
            : []),
        ];
  const [socials, setSocials] = useState<Social[]>(initialSocials);
  const addSocial = () => {
    const used = new Set(socials.map((s) => s.platform));
    const next = SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? "instagram";
    setSocials((s) => [...s, { platform: next, url: "" }]);
  };
  const patchSocial = (i: number, patch: Partial<Social>) =>
    setSocials((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeSocial = (i: number) =>
    setSocials((s) => s.filter((_, j) => j !== i));

  // Image plein écran de la page Contact (upload immédiat, comme avant).
  const [image, setImage] = useState<StoredImage | null>(
    settings?.contactImage ?? null,
  );
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function uploadImage(file: File) {
    setImgBusy(true);
    try {
      const fd = new FormData();
      // Redimensionne côté navigateur (≤2560 px) avant l'envoi : même rendu, mais
      // on n'envoie pas l'original plein format (rapidité + fiabilité serveur).
      fd.append("file", await downscaleForUpload(file));
      const res = await fetch("/api/admin/upload-contact", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error ?? "L'image n'a pas pu être envoyée.");
      setImage(data.image as StoredImage);
      toast.success("Image enregistrée");
      router.refresh();
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

  async function removeImage() {
    setImgBusy(true);
    try {
      await clearContactImage();
      setImage(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "L'image n'a pas pu être retirée. Réessayez.",
      );
    } finally {
      setImgBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = socials
      .map((s) => ({ platform: s.platform, url: normalizeUrl(s.url) }))
      .filter((s) => s.url);
    start(async () => {
      try {
        await updateContact({ ...form, socials: cleaned });
        toast.success("Contact enregistré");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Le contact n'a pas pu être enregistré. Réessayez.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email de contact</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="bonjour@votresite.com"
          />
          <p className="text-xs text-muted-foreground">
            Affiché sur la page Contact et dans le cadre du site (copie au clic).
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactPhone">Téléphone</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={form.contactPhone}
            onChange={set("contactPhone")}
            placeholder="+33 6 12 34 56 78"
          />
          <p className="text-xs text-muted-foreground">
            Affiché sur la page Contact (appel au clic). Laisser vide pour masquer.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contactLocation">Lieu</Label>
        <Input
          id="contactLocation"
          value={form.contactLocation}
          onChange={set("contactLocation")}
          placeholder="Nantes, France"
        />
        <p className="text-xs text-muted-foreground">
          Où vous vous trouvez (affiché sur la page Contact). Laisser vide pour
          masquer.
        </p>
      </div>

      {/* Réseaux sociaux — sélecteur à icône (compact) + URL, cf. réglage déplacé ici. */}
      <div className="grid gap-2">
        <Label>Réseaux sociaux</Label>
        <div className="grid gap-2">
          {socials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun réseau. Ajoutez-en un ci-dessous.
            </p>
          )}
          {socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.platform as keyof typeof SOCIAL_ICONS];
            return (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={s.platform}
                  onValueChange={(v) => patchSocial(i, { platform: v })}
                >
                  <SelectTrigger
                    aria-label={`Réseau : ${SOCIAL_META[s.platform as keyof typeof SOCIAL_META]?.label ?? s.platform}`}
                    className="w-14 shrink-0 justify-center gap-1 sm:w-40 sm:justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="size-4 shrink-0" />}
                      <span className="hidden sm:inline">
                        {SOCIAL_META[s.platform as keyof typeof SOCIAL_META]
                          ?.label ?? s.platform}
                      </span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map((p) => {
                      const PIcon = SOCIAL_ICONS[p];
                      return (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2">
                            {PIcon && <PIcon className="size-4 shrink-0" />}
                            {SOCIAL_META[p].label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input
                  value={s.url}
                  onChange={(e) => patchSocial(i, { url: e.target.value })}
                  className="min-w-0 flex-1"
                  placeholder={
                    SOCIAL_META[s.platform as keyof typeof SOCIAL_META]
                      ?.placeholder
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Retirer"
                  onClick={() => removeSocial(i)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSocial}
            disabled={socials.length >= SOCIAL_PLATFORMS.length}
          >
            <Plus className="mr-1 size-4" />
            Ajouter un réseau
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Image plein écran</Label>
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {image?.variants.webp?.at(-1)?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.variants.webp.at(-1)!.url}
                alt="Aperçu"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Aucune
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imgBusy}
              onClick={() => fileRef.current?.click()}
            >
              {imgBusy ? (
                <Spinner className="mr-1" />
              ) : (
                <ImageUp className="mr-1 size-4" />
              )}
              {image ? "Remplacer" : "Choisir une image"}
            </Button>
            {image && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={imgBusy}
                onClick={removeImage}
              >
                <X className="mr-1 size-4" /> Retirer
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contactTitle">Titre</Label>
        <Input
          id="contactTitle"
          value={form.contactTitle}
          onChange={set("contactTitle")}
          placeholder="Donnons vie à vos images"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contactText">Texte</Label>
        <Textarea
          id="contactText"
          rows={5}
          value={form.contactText}
          onChange={set("contactText")}
        />
      </div>

      <SaveBar>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </SaveBar>
    </form>
  );
}
