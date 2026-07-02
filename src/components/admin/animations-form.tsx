"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { updateAnimations } from "@/server/actions/settings";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ANIMATION_INFO,
  DEFAULT_ANIMATIONS,
  resolveAnimations,
  type AnimationSettings,
} from "@/lib/animations";
import { AnimationPreview } from "@/components/admin/animation-preview";

const SPEEDS = [
  ["fast", "Rapide"],
  ["medium", "Moyen"],
  ["slow", "Lent"],
] as const;

/** Carte « Animations » : on/off + intensité + aperçu live + vitesses. */
export function AnimationsForm({
  animations,
}: {
  animations: AnimationSettings | null | undefined;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [anim, setAnim] = useState<AnimationSettings>(
    resolveAnimations(animations),
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await updateAnimations({ animations: anim });
        toast.success("Animations enregistrées");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Les animations n'ont pas pu être enregistrées. Réessayez.",
        );
      }
    });
  }

  /** Sélecteur de vitesse (3 presets) — grisé quand l'effet est désactivé. */
  const speedRow = (
    enabled: boolean,
    key: "pageTransitionSpeed" | "projectTransitionSpeed" | "loaderSpeed",
  ) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">Vitesse</span>
      <div className="inline-flex overflow-hidden rounded-md border">
        {SPEEDS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={!enabled}
            onClick={() => setAnimField(key, value)}
            className={cn(
              "px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
              anim[key] === value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  /** En-tête d'un réglage : titre + réinitialiser + interrupteur. */
  const header = (
    label: string,
    checked: boolean,
    onCheck: (v: boolean) => void,
    ...resetKeys: (keyof AnimationSettings)[]
  ) => (
    <div className="flex items-center justify-between gap-3">
      <Label className="font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Rétablir la valeur par défaut de cette animation"
          onClick={() => resetAnimFields(...resetKeys)}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Réinitialiser
        </button>
        <Switch checked={checked} onCheckedChange={onCheck} />
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {/* Effets avec intensité + aperçu live */}
      {ANIMATION_INFO.map((info) => {
        const enabledKey = `${info.key}Enabled` as keyof AnimationSettings;
        const intensityKey = `${info.key}Intensity` as keyof AnimationSettings;
        const enabled = anim[enabledKey] as boolean;
        const intensity = anim[intensityKey] as number;
        return (
          <div
            key={info.key}
            // Mobile : l'aperçu (128 px) passe SOUS les contrôles — côte à côte,
            // il écrasait titre/description/curseur sur une colonne minuscule.
            className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start"
          >
            <div className="grid min-w-0 flex-1 gap-2">
              {header(info.label, enabled, (v) => setAnimField(enabledKey, v), enabledKey, intensityKey)}
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
            <div className="self-center sm:self-start">
              <AnimationPreview
                kind={info.key}
                enabled={enabled}
                intensity={intensity}
              />
            </div>
          </div>
        );
      })}

      {/* Défilement infini */}
      <div className="grid gap-1 border-b border-border/60 pb-4">
        {header(
          "Défilement infini",
          anim.infiniteScrollEnabled,
          (v) => setAnimField("infiniteScrollEnabled", v),
          "infiniteScrollEnabled",
        )}
        <p className="text-xs text-muted-foreground">
          La galerie boucle sans fin : arrivé en bas, on repart du début.
          Désactivé, elle s&apos;arrête à la dernière photo (défilement
          classique).
        </p>
      </div>

      {/* Transition de page + vitesse */}
      <div className="grid gap-3 border-b border-border/60 pb-4">
        {header(
          "Transition de page",
          anim.pageTransitionEnabled,
          (v) => setAnimField("pageTransitionEnabled", v),
          "pageTransitionEnabled",
          "pageTransitionSpeed",
        )}
        <p className="text-xs text-muted-foreground">
          Au changement de page : la page se dézoome dans un viseur
          d&apos;appareil photo et le texte se brouille en Matrix. Désactivé, la
          navigation est instantanée.
        </p>
        {speedRow(anim.pageTransitionEnabled, "pageTransitionSpeed")}
      </div>

      {/* Ouverture de projet + vitesse */}
      <div className="grid gap-3 border-b border-border/60 pb-4">
        {header(
          "Ouverture de projet",
          anim.projectTransitionEnabled,
          (v) => setAnimField("projectTransitionEnabled", v),
          "projectTransitionEnabled",
          "projectTransitionSpeed",
        )}
        <p className="text-xs text-muted-foreground">
          Au clic sur un projet : le petit cadre s&apos;ouvre sur la galerie
          depuis la 1ʳᵉ photo. Désactivé, la galerie s&apos;affiche directement.
        </p>
        {speedRow(anim.projectTransitionEnabled, "projectTransitionSpeed")}
      </div>

      {/* Animation de démarrage + vitesse */}
      <div className="grid gap-3">
        {header(
          "Animation de démarrage",
          anim.loaderEnabled,
          (v) => setAnimField("loaderEnabled", v),
          "loaderEnabled",
          "loaderSpeed",
        )}
        <p className="text-xs text-muted-foreground">
          Au 1ᵉʳ chargement (1×/session) : écran blanc, le nom du site
          s&apos;écrit, la page se dézoome dans le viseur et le cadre se dessine
          avant d&apos;arriver sur l&apos;accueil. Désactivé, le site
          s&apos;affiche directement.
        </p>
        {speedRow(anim.loaderEnabled, "loaderSpeed")}
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
