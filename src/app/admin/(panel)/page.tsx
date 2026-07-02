import {
  TrendingUp,
  BarChart3,
  Eye,
  Users,
  Clock,
  LogOut,
  Radio,
  MousePointerClick,
  HeartPulse,
  Images,
} from "lucide-react";
import { getAnalytics } from "@/server/db/queries/analytics";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { KpiCard } from "@/components/admin/kpi-card";
import { RangeSelector } from "@/components/admin/range-selector";
import { ResetAnalyticsButton } from "@/components/admin/reset-analytics-button";
import { PageHeader } from "@/components/admin/page-header";
import {
  DashboardAlerts,
  computeAlerts,
} from "@/components/admin/dashboard-alerts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtPath(p: string) {
  return p === "/" ? "Accueil" : p;
}

/** Libellés lisibles des événements de clic suivis. */
const CLICK_LABELS: Record<string, string> = {
  "social:instagram": "Instagram",
  "social:linkedin": "LinkedIn",
  email_copy: "Email copié (cadre)",
  contact_email: "Email — page contact",
};
const clickLabel = (name: string) =>
  CLICK_LABELS[name] ??
  (name.startsWith("social:") ? name.slice(7) : name).replace(/[_:]/g, " ");

/** Pastille de statut Web Vitals selon les seuils officiels (p75). */
function VitalRow({
  label,
  value,
  display,
  good,
  poor,
}: {
  label: string;
  value: number | null;
  display: string;
  good: number;
  poor: number;
}) {
  const tone =
    value == null
      ? "muted"
      : value <= good
        ? "good"
        : value <= poor
          ? "warn"
          : "bad";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            tone === "good" && "bg-emerald-500",
            tone === "warn" && "bg-amber-500",
            tone === "bad" && "bg-red-500",
            tone === "muted" && "bg-muted-foreground/30",
          )}
        />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{display}</span>
    </div>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeRaw } = await searchParams;
  const range = Number(rangeRaw) || 30;
  const d = await getAnalytics(range).catch(() => null);

  if (!d) {
    return (
      <p className="text-muted-foreground">
        Le tableau de bord est momentanément indisponible. Réessayez dans un
        instant.
      </p>
    );
  }

  const t = d.totals;
  const noTraffic = t.views === 0;
  const alerts = computeAlerts(d);

  const topMax = d.topPages[0]?.views || 1;
  const projMax = d.topProjects[0]?.views || 1;
  const srcMax = d.sources[0]?.count || 1;
  const clickMax = d.clicks[0]?.count || 1;

  const newPct =
    t.visitors > 0 ? Math.round((t.newVisitors / t.visitors) * 100) : 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Performances du portfolio en un coup d'œil — et ce qui mérite votre attention."
        actions={
          <div className="flex items-center gap-2">
            <RangeSelector current={d.range} />
            <ResetAnalyticsButton />
          </div>
        }
      />

      {/* Ce qui mérite l'attention (sinon : tout va bien) */}
      <DashboardAlerts alerts={alerts} />

      {/* KPIs avec tendance + contexte */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Visiteurs uniques"
          value={formatNumber(t.visitors)}
          current={t.visitors}
          previous={d.prev.visitors}
          icon={Users}
          sub={
            <>
              Auj.&nbsp;<b className="text-foreground">{d.recent.today}</b> · 7 j&nbsp;
              <b className="text-foreground">{d.recent.week}</b> · 30 j&nbsp;
              <b className="text-foreground">{d.recent.month}</b>
            </>
          }
        />
        <KpiCard
          label="Vues"
          value={formatNumber(t.views)}
          current={t.views}
          previous={d.prev.views}
          icon={Eye}
          sub={
            <>
              {t.pagesPerSession.toFixed(1).replace(".", ",")} pages / session ·{" "}
              {formatNumber(t.sessions)} sessions
            </>
          }
        />
        <KpiCard
          label="Durée moy. / visite"
          value={t.avgDuration > 0 ? formatDuration(t.avgDuration) : "—"}
          current={t.avgDuration}
          previous={d.prev.avgDuration}
          icon={Clock}
          hint="Pas assez de données"
          sub={
            t.visitors > 0 ? (
              <>
                Nouveaux {newPct} % · Récurrents {100 - newPct} %
              </>
            ) : undefined
          }
        />
        <KpiCard
          label="Taux de rebond"
          value={`${Math.round(t.bounce * 100)} %`}
          current={t.bounce * 100}
          previous={d.prev.bounce * 100}
          icon={LogOut}
          invert
          sub="Part des visites à une seule page"
        />
      </div>

      {/* Courbe de fréquentation */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Fréquentation — {d.range} derniers jours
            </CardTitle>
            <CardDescription>
              {formatNumber(t.views)} vues · {formatNumber(t.visitors)} visiteurs
              · {formatNumber(t.sessions)} sessions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {noTraffic ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Aucune visite sur la période.
            </div>
          ) : (
            <TrafficChart data={d.series} />
          )}
        </CardContent>
      </Card>

      {/* Sources · Liens importants · Santé du site */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4 text-primary" />
              Sources de trafic
            </CardTitle>
            <CardDescription>D&apos;où viennent les visiteurs</CardDescription>
          </CardHeader>
          <CardContent>
            {d.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ul className="grid gap-2.5">
                {d.sources.map((s) => (
                  <li key={s.label} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{s.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(s.count)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(s.count / srcMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointerClick className="size-4 text-primary" />
              Liens importants
            </CardTitle>
            <CardDescription>
              Clics Instagram, LinkedIn, email…
            </CardDescription>
          </CardHeader>
          <CardContent>
            {d.clicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun clic enregistré pour l&apos;instant. Les clics sur les
                réseaux sociaux et l&apos;email sont désormais suivis — les
                données apparaîtront ici au fil des visites.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {d.clicks.map((c) => {
                  const delta =
                    c.prevCount > 0
                      ? Math.round(((c.count - c.prevCount) / c.prevCount) * 100)
                      : null;
                  return (
                    <li key={c.name} className="grid gap-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{clickLabel(c.name)}</span>
                        <span className="flex shrink-0 items-baseline gap-2">
                          {delta !== null && delta !== 0 && (
                            <span
                              className={cn(
                                "text-xs tabular-nums",
                                delta > 0 ? "text-emerald-600" : "text-red-600",
                              )}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta} %
                            </span>
                          )}
                          <span className="font-semibold tabular-nums">
                            {formatNumber(c.count)}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${(c.count / clickMax) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4 text-primary" />
              Santé du site
            </CardTitle>
            <CardDescription>
              Web Vitals (p75) &amp; erreurs sur la période
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <VitalRow
              label="Chargement (LCP)"
              value={d.vitals.lcp}
              display={
                d.vitals.lcp != null
                  ? `${(d.vitals.lcp / 1000).toFixed(1).replace(".", ",")} s`
                  : "—"
              }
              good={2500}
              poor={4000}
            />
            <VitalRow
              label="Réactivité (INP)"
              value={d.vitals.inp}
              display={d.vitals.inp != null ? `${Math.round(d.vitals.inp)} ms` : "—"}
              good={200}
              poor={500}
            />
            <VitalRow
              label="Stabilité (CLS)"
              value={d.vitals.cls}
              display={
                d.vitals.cls != null
                  ? d.vitals.cls.toFixed(2).replace(".", ",")
                  : "—"
              }
              good={0.1}
              poor={0.25}
            />
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      d.errors.count === 0 ? "bg-emerald-500" : "bg-red-500",
                    )}
                  />
                  Erreurs JS
                </span>
                <span className="font-semibold tabular-nums">
                  {d.errors.count}
                </span>
              </div>
              {d.errors.recent.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {d.errors.recent.slice(0, 3).map((e, i) => (
                    <li
                      key={i}
                      className="truncate font-mono text-xs text-muted-foreground"
                      title={`${e.message} — ${e.path}`}
                    >
                      {e.message}
                    </li>
                  ))}
                </ul>
              )}
              {d.errors.count === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Aucune erreur détectée chez les visiteurs.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages · Projets les plus consultés */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Pages les plus vues
            </CardTitle>
            <CardDescription>Sections du site (hors fiches projet)</CardDescription>
          </CardHeader>
          <CardContent>
            {d.topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune visite enregistrée.
              </p>
            ) : (
              <ul className="grid gap-3">
                {d.topPages.map((p) => (
                  <li key={p.path} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {fmtPath(p.path)}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                        {p.avgDuration > 0 && (
                          <span className="tabular-nums">
                            {formatDuration(p.avgDuration)}
                          </span>
                        )}
                        <span className="tabular-nums font-medium text-foreground">
                          {formatNumber(p.views)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(p.views / topMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Images className="size-4 text-primary" />
              Projets les plus consultés
            </CardTitle>
            <CardDescription>
              Fiches projet ouvertes par les visiteurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {d.topProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun projet consulté sur la période.
              </p>
            ) : (
              <ul className="grid gap-3">
                {d.topProjects.map((p) => (
                  <li key={p.path} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{p.title}</span>
                      <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                        {p.avgDuration > 0 && (
                          <span className="tabular-nums">
                            {formatDuration(p.avgDuration)}
                          </span>
                        )}
                        <span className="tabular-nums font-medium text-foreground">
                          {formatNumber(p.views)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(p.views / projMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
