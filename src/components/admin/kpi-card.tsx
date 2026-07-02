import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Carte d'indicateur clé avec tendance vs période précédente.
 * `invert` : pour les métriques où baisser = mieux (ex. taux de rebond).
 */
export function KpiCard({
  label,
  value,
  current,
  previous,
  icon: Icon,
  invert = false,
  hint,
  sub,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  icon: LucideIcon;
  invert?: boolean;
  hint?: string;
  /** Ligne de contexte sous la tendance (ex. « Auj. 12 · 7 j 48 · 30 j 130 »). */
  sub?: React.ReactNode;
}) {
  const hasPrev = previous > 0;
  const deltaPct = hasPrev ? ((current - previous) / previous) * 100 : null;
  const up = (deltaPct ?? 0) > 0.5;
  const down = (deltaPct ?? 0) < -0.5;
  const flat = !up && !down;
  // « bon » = hausse, sauf si invert (rebond : la baisse est bonne).
  const good = invert ? down : up;
  const bad = invert ? up : down;

  return (
    <Card>
      <CardContent className="grid gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <Icon className="size-4 text-primary" />
          </span>
        </div>
        <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {value}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {deltaPct === null ? (
            <span className="text-muted-foreground">{hint ?? "Nouvelle période"}</span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium tabular-nums",
                  good && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  bad && "bg-red-500/10 text-red-600 dark:text-red-400",
                  flat && "bg-muted text-muted-foreground",
                )}
              >
                {up && <ArrowUp className="size-3" />}
                {down && <ArrowDown className="size-3" />}
                {flat && <Minus className="size-3" />}
                {Math.abs(deltaPct).toFixed(0)}%
              </span>
              <span className="text-muted-foreground">vs période préc.</span>
            </>
          )}
        </div>
        {sub && (
          <div className="border-t border-border pt-2 text-xs text-muted-foreground">
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
