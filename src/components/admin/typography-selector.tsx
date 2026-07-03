"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  updateTypography,
  updateTypographyWeight,
} from "@/server/actions/settings";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  TYPOGRAPHY_THEMES,
  DEFAULT_TYPOGRAPHY,
} from "@/lib/typography-themes";
import {
  TYPOGRAPHY_FONTS,
  TYPOGRAPHY_ALL_CLASSES,
} from "@/lib/typography-fonts";

/**
 * Sélecteur de thème typographique : une carte par thème avec APERÇU LIVE
 * (vraies polices auto-hébergées — le navigateur ne télécharge que celles
 * effectivement affichées). Clic = appliqué immédiatement à tout le site.
 */
const WEIGHTS = [
  ["light", "Plus fin"],
  ["normal", "Normale"],
  ["bold", "Plus épais"],
] as const;

export function TypographySelector({
  current,
  currentWeight,
}: {
  current: string | null;
  currentWeight: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [applying, setApplying] = useState<string | null>(null);
  // Optimiste : la graisse choisie s'applique AUX APERÇUS immédiatement au clic,
  // sans attendre l'aller-retour serveur.
  const [optimisticWeight, setOptimisticWeight] = useState<string | null>(null);
  const active = current ?? DEFAULT_TYPOGRAPHY;
  const weight = optimisticWeight ?? currentWeight ?? "normal";
  // Graisses des aperçus : reflètent le réglage (fin → hairline, épais → gras).
  const previewHeading = weight === "light" ? 200 : weight === "bold" ? 700 : 400;
  const previewBody = weight === "light" ? 200 : weight === "bold" ? 600 : 400;

  const apply = (id: string) => {
    if (id === active || pending) return;
    setApplying(id);
    start(async () => {
      try {
        await updateTypography(id);
        toast.success("Typographie appliquée à tout le site");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Le thème n'a pas pu être appliqué. Réessayez.",
        );
      } finally {
        setApplying(null);
      }
    });
  };

  const applyWeight = (w: string) => {
    if (w === weight || pending) return;
    setOptimisticWeight(w); // aperçus mis à jour instantanément
    start(async () => {
      try {
        await updateTypographyWeight(w);
        toast.success("Graisse appliquée à tout le site");
        router.refresh();
      } catch (err) {
        setOptimisticWeight(null);
        toast.error(
          err instanceof Error
            ? err.message
            : "La graisse n'a pas pu être appliquée. Réessayez.",
        );
      }
    });
  };

  return (
    <div className="grid gap-4">
      {/* Graisse globale — appliquée par-dessus le thème choisi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Graisse du texte (tout le site)
        </span>
        <div className="inline-flex overflow-hidden rounded-md border">
          {WEIGHTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => applyWeight(value)}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                weight === value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Les classes de TOUTES les polices sont posées ici → chaque carte peut
          référencer ses variables pour l'aperçu. */}
      <div
        className={cn(
          "grid max-h-[34rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3",
          TYPOGRAPHY_ALL_CLASSES,
        )}
      >
      {TYPOGRAPHY_THEMES.map((t) => {
        const fonts = TYPOGRAPHY_FONTS[t.id];
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => apply(t.id)}
            disabled={pending}
            title={t.why}
            className={cn(
              "grid content-start gap-1.5 rounded-lg border p-4 text-left transition-colors",
              isActive
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/60",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.name}
              </span>
              {applying === t.id ? (
                <Spinner className="size-3.5" />
              ) : (
                isActive && <Check className="size-4 shrink-0 text-primary" />
              )}
            </span>
            {/* Aperçu TITRE (vraie police) */}
            <span
              className="truncate text-2xl leading-tight"
              style={{
                fontFamily: `var(${fonts.headingVar})`,
                fontWeight: previewHeading,
              }}
            >
              Ambre Clément
            </span>
            {/* Aperçu TEXTE (vraie police) */}
            <span
              className="line-clamp-2 text-[13px] leading-snug text-muted-foreground"
              style={{
                fontFamily: `var(${fonts.bodyVar})`,
                fontWeight: previewBody,
              }}
            >
              Photographie — portraits, maternité &amp; projets. {t.description}
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {t.heading}
              {t.body !== t.heading ? ` + ${t.body}` : ""}
            </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
