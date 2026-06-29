"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus, ImageUp, RotateCcw } from "lucide-react";
import { updateSettings, clearContactImage } from "@/server/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { SOCIAL_PLATFORMS, SOCIAL_META } from "@/lib/social-platforms";
import { cn } from "@/lib/utils";
import {
  ANIMATION_INFO,
  DEFAULT_ANIMATIONS,
  resolveAnimations,
  type AnimationSettings,
} from "@/lib/animations";
import { AnimationPreview } from "@/components/admin/animation-preview";
import type { StoredImage } from "@/server/db/schema";

type Social = { platform: string; url: string };
type Settings = {
  email: string | null;
  contactTitle?: string | null;
  contactText: string | null;
  contactImage?: StoredImage | null;
  legalNotice: string | null;
  socials?: Social[] | null;
  animations?: AnimationSettings | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
};

const normalizeUrl = (u: string) => {
  const v = u.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    email: settings?.email ?? "",
    contactTitle: settings?.contactTitle ?? "",
    contactText: settings?.contactText ?? "",
    legalNotice: settings?.legalNotice ?? "",
  });

  // Animations (on/off + intensité par effet)
  const [anim, setAnim] = useState<AnimationSettings>(
    resolveAnimations(settings?.animations),
  );
  const setAnimField = <K extends keyof AnimationSettings>(
    k: K,
    v: AnimationSettings[K],
  ) => setAnim((a) => ({ ...a, [k]: v }));
  // Remet uniquement les champs donnés à leur valeur par défaut (reset par effet).
  const resetAnimFields = (...keys: (keyof AnimationSettings)[]) =>
    setAnim((a) => {
      const next = { ...a } as Record<string, unknown>;
      for (const k of keys) next[k] = DEFAULT_ANIMATIONS[k];
      return next as AnimationSettings;
    });

  // Image plein écran de la page Contact (upload immédiat).
  const [image, setImage] = useState<StoredImage | null>(
    settings?.contactImage ?? null,
  );
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function uploadImage(file: File) {
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
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

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSocial = () => {
    const used = new Set(socials.map((s) => s.platform));
    const next = SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? "instagram";
    setSocials((s) => [...s, { platform: next, url: "" }]);
  };
  const patchSocial = (i: number, patch: Partial<Social>) =>
    setSocials((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeSocial = (i: number) =>
    setSocials((s) => s.filter((_, j) => j !== i));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = socials
      .map((s) => ({ platform: s.platform, url: normalizeUrl(s.url) }))
      .filter((s) => s.url);
    start(async () => {
      try {
        await updateSettings({ ...form, socials: cleaned, animations: anim });
        toast.success("Réglages enregistrés");
        router.refresh();
      } catch (err) {
        console.error("Échec de l'enregistrement des réglages :", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Les réglages n'ont pas pu être enregistrés. Réessayez.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email de contact</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="bonjour@votresite.com"
        />
      </div>

      {/* Réseaux sociaux — liste éditable et extensible */}
      <div className="grid gap-2">
        <Label>Réseaux sociaux</Label>
        <div className="grid gap-2">
          {socials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun réseau. Ajoutez-en un ci-dessous.
            </p>
          )}
          {socials.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={s.platform}
                onChange={(e) => patchSocial(i, { platform: e.target.value })}
                aria-label="Réseau"
                className="h-9 w-36 shrink-0 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_META[p].label}
                  </option>
                ))}
              </select>
              <Input
                value={s.url}
                onChange={(e) => patchSocial(i, { url: e.target.value })}
                placeholder={
                  SOCIAL_META[s.platform as keyof typeof SOCIAL_META]
                    ?.placeholder
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer"
                onClick={() => removeSocial(i)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
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

      {/* Page Contact : image plein écran + titre + texte */}
      <div className="grid gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Page Contact</p>

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
            rows={4}
            value={form.contactText}
            onChange={set("contactText")}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="legalNotice">Mentions légales</Label>
        <Textarea
          id="legalNotice"
          rows={4}
          value={form.legalNotice}
          onChange={set("legalNotice")}
        />
        <p className="text-xs text-muted-foreground">
          Texte de la page « Mentions légales » (obligatoire en France).
        </p>
      </div>

      {/* Animations : on/off + intensité + aperçu live, avec explication */}
      <div className="grid gap-4 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Animations</p>
        {ANIMATION_INFO.map((info) => {
          const enabledKey = `${info.key}Enabled` as keyof AnimationSettings;
          const intensityKey =
            `${info.key}Intensity` as keyof AnimationSettings;
          const enabled = anim[enabledKey] as boolean;
          const intensity = anim[intensityKey] as number;
          return (
            <div
              key={info.key}
              className="flex items-start gap-4 border-b border-border/60 pb-4 last:border-0 last:pb-0"
            >
              {/* Gauche : titre + interrupteur + description + intensité */}
              <div className="grid min-w-0 flex-1 gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-medium">{info.label}</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Rétablir la valeur par défaut de cette animation"
                      onClick={() => resetAnimFields(enabledKey, intensityKey)}
                      className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <RotateCcw className="size-3" /> Réinitialiser
                    </button>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => setAnimField(enabledKey, v)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{info.help}</p>
                <div
                  className={`flex items-center gap-3 ${enabled ? "" : "pointer-events-none opacity-40"}`}
                >
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    Intensité
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={intensity}
                    disabled={!enabled}
                    onChange={(e) =>
                      setAnimField(intensityKey, Number(e.target.value))
                    }
                    className="h-1.5 w-full cursor-pointer accent-primary"
                  />
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums">
                    {intensity}%
                  </span>
                </div>
              </div>

              {/* Droite : aperçu live (survole / bouge la souris dedans) */}
              <AnimationPreview
                kind={info.key}
                enabled={enabled}
                intensity={intensity}
              />
            </div>
          );
        })}

        {/* ── Navigation : interrupteurs simples (mêmes séparateurs que les effets) ── */}
        <div className="grid gap-4">
          {/* Défilement infini */}
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div className="grid min-w-0 flex-1 gap-1">
              <Label className="font-medium">Défilement infini</Label>
              <p className="text-xs text-muted-foreground">
                La galerie boucle sans fin : arrivé en bas, on repart du début.
                Désactivé, elle s&apos;arrête à la dernière photo (défilement
                classique).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Rétablir la valeur par défaut de cette animation"
                onClick={() => resetAnimFields("infiniteScrollEnabled")}
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3" /> Réinitialiser
              </button>
              <Switch
                checked={anim.infiniteScrollEnabled}
                onCheckedChange={(v) => setAnimField("infiniteScrollEnabled", v)}
              />
            </div>
          </div>

          {/* Transition de page + sa vitesse (sous-réglage) */}
          <div className="grid gap-3 border-b border-border/60 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 flex-1 gap-1">
                <Label className="font-medium">Transition de page</Label>
                <p className="text-xs text-muted-foreground">
                  Au changement de page : la page se dézoome dans un viseur
                  d&apos;appareil photo et le texte se brouille en Matrix.
                  Désactivé, la navigation est instantanée.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Rétablir la valeur par défaut de cette animation"
                  onClick={() =>
                    resetAnimFields(
                      "pageTransitionEnabled",
                      "pageTransitionSpeed",
                    )
                  }
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-3" /> Réinitialiser
                </button>
                <Switch
                  checked={anim.pageTransitionEnabled}
                  onCheckedChange={(v) => setAnimField("pageTransitionEnabled", v)}
                />
              </div>
            </div>

            {/* Vitesse — 3 presets, Moyen par défaut (grisé si transition off) */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Vitesse</span>
              <div className="inline-flex overflow-hidden rounded-md border">
                {(
                  [
                    ["fast", "Rapide"],
                    ["medium", "Moyen"],
                    ["slow", "Lent"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!anim.pageTransitionEnabled}
                    onClick={() => setAnimField("pageTransitionSpeed", value)}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                      anim.pageTransitionSpeed === value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ouverture de projet + sa vitesse */}
          <div className="grid gap-3 border-b border-border/60 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 flex-1 gap-1">
                <Label className="font-medium">Ouverture de projet</Label>
                <p className="text-xs text-muted-foreground">
                  Au clic sur un projet : le petit cadre s&apos;ouvre sur la galerie
                  depuis la 1ʳᵉ photo. Désactivé, la galerie s&apos;affiche
                  directement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Rétablir la valeur par défaut de cette animation"
                  onClick={() =>
                    resetAnimFields(
                      "projectTransitionEnabled",
                      "projectTransitionSpeed",
                    )
                  }
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-3" /> Réinitialiser
                </button>
                <Switch
                  checked={anim.projectTransitionEnabled}
                  onCheckedChange={(v) =>
                    setAnimField("projectTransitionEnabled", v)
                  }
                />
              </div>
            </div>

            {/* Vitesse — mêmes paliers (grisé si ouverture off) */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Vitesse</span>
              <div className="inline-flex overflow-hidden rounded-md border">
                {(
                  [
                    ["fast", "Rapide"],
                    ["medium", "Moyen"],
                    ["slow", "Lent"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!anim.projectTransitionEnabled}
                    onClick={() => setAnimField("projectTransitionSpeed", value)}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                      anim.projectTransitionSpeed === value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Animation de démarrage (loader) + sa vitesse */}
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 flex-1 gap-1">
                <Label className="font-medium">Animation de démarrage</Label>
                <p className="text-xs text-muted-foreground">
                  Au 1ᵉʳ chargement (1×/session) : écran blanc, « AMBRE CLÉMENT »
                  s&apos;écrit, la page se dézoome dans le viseur et le cadre se
                  dessine avant d&apos;arriver sur l&apos;accueil. Désactivé, le
                  site s&apos;affiche directement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Rétablir la valeur par défaut de cette animation"
                  onClick={() => resetAnimFields("loaderEnabled", "loaderSpeed")}
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-3" /> Réinitialiser
                </button>
                <Switch
                  checked={anim.loaderEnabled}
                  onCheckedChange={(v) => setAnimField("loaderEnabled", v)}
                />
              </div>
            </div>

            {/* Vitesse — mêmes paliers que la transition (grisé si loader off) */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Vitesse</span>
              <div className="inline-flex overflow-hidden rounded-md border">
                {(
                  [
                    ["fast", "Rapide"],
                    ["medium", "Moyen"],
                    ["slow", "Lent"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!anim.loaderEnabled}
                    onClick={() => setAnimField("loaderSpeed", value)}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                      anim.loaderSpeed === value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
