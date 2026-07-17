import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Zap,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/server/db/queries/analytics";

export type DashboardAlert = {
  key: string;
  tone: "bad" | "warn" | "good";
  icon: "down" | "up" | "perf" | "bug" | "warn";
  text: string;
};

const fmtS = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;

/**
 * Calcule les alertes « qui méritent l'attention » à partir des données.
 * Volontairement SILENCIEUX quand tout va bien ou que le volume est trop
 * faible pour être significatif (pas de bruit sur un petit portfolio).
 */
export function computeAlerts(d: AnalyticsData): DashboardAlert[] {
  const out: DashboardAlert[] = [];
  const t = d.totals;

  // Trafic : variation forte vs période précédente (si volume significatif).
  if (d.prev.views >= 10) {
    const delta = ((t.views - d.prev.views) / d.prev.views) * 100;
    if (delta <= -30)
      out.push({
        key: "traffic-down",
        tone: "bad",
        icon: "down",
        text: `Trafic en baisse de ${Math.abs(Math.round(delta))} % vs période précédente (${t.views} vues contre ${d.prev.views}).`,
      });
    else if (delta >= 30)
      out.push({
        key: "traffic-up",
        tone: "good",
        icon: "up",
        text: `Trafic en hausse de ${Math.round(delta)} % vs période précédente — regardez les sources pour comprendre d'où ça vient.`,
      });
  }

  // Rebond élevé (volume suffisant pour être interprétable).
  if (t.views >= 30 && t.bounce > 0.7)
    out.push({
      key: "bounce",
      tone: "warn",
      icon: "warn",
      text: `Taux de rebond élevé (${Math.round(t.bounce * 100)} %) : la plupart des visiteurs repartent après une seule page.`,
    });

  // Performances (seuils officiels Web Vitals, mesure p75).
  if (d.vitals.lcp != null && d.vitals.lcp > 2500)
    out.push({
      key: "lcp",
      tone: d.vitals.lcp > 4000 ? "bad" : "warn",
      icon: "perf",
      text: `Chargement lent : LCP p75 à ${fmtS(d.vitals.lcp)} (cible < 2,5 s).`,
    });
  if (d.vitals.inp != null && d.vitals.inp > 200)
    out.push({
      key: "inp",
      tone: d.vitals.inp > 500 ? "bad" : "warn",
      icon: "perf",
      text: `Réactivité à surveiller : INP p75 à ${Math.round(d.vitals.inp)} ms (cible < 200 ms).`,
    });
  // CLS volontairement absent du bandeau (choix : trop anxiogène pour un signal
  // que l'utilisatrice ne peut pas corriger elle-même) — reste visible page Système.

  // Erreurs JS.
  if (d.errors.count > 0)
    out.push({
      key: "errors",
      tone: "bad",
      icon: "bug",
      text: `${d.errors.count} erreur${d.errors.count > 1 ? "s" : ""} JavaScript sur la période (${d.errors.sessions} session${d.errors.sessions > 1 ? "s" : ""} touchée${d.errors.sessions > 1 ? "s" : ""}) — détail dans l'onglet « Système ».`,
    });

  return out;
}

const ICONS = {
  down: TrendingDown,
  up: TrendingUp,
  perf: Zap,
  bug: Bug,
  warn: AlertTriangle,
} as const;

/** Bandeau d'alertes : uniquement ce qui mérite l'attention — rien quand tout va bien. */
export function DashboardAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {alerts.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <li
            key={a.key}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-4 py-2.5 text-sm",
              a.tone === "bad" && "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-400",
              a.tone === "warn" &&
                "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400",
              a.tone === "good" &&
                "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{a.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
