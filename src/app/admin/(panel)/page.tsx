import {
  TrendingUp,
  BarChart3,
  Eye,
  Users,
  Clock,
  LogOut,
  Radio,
  MousePointerClick,
  Images,
} from "lucide-react";
import { getAnalytics } from "@/server/db/queries/analytics";
import { getStorageUsage } from "@/server/images/storage";
import { StorageCard } from "@/components/admin/storage-card";
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
  contact_phone: "Téléphone — page contact",
};
const clickLabel = (name: string) =>
  CLICK_LABELS[name] ??
  (name.startsWith("social:") ? name.slice(7) : name).replace(/[_:]/g, " ");

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeRaw } = await searchParams;
  const range = Number(rangeRaw) || 30;
  const [d, storageUsage] = await Promise.all([
    getAnalytics(range).catch(() => null),
    getStorageUsage().catch(() => null),
  ]);

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

      {/* Ce qui mérite l'attention (rien affiché quand tout va bien) */}
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

      {/* Stockage des photos — visible d'un coup d'œil, sans aller dans Système */}
      <StorageCard usage={storageUsage} />

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

      {/* Sources · Liens importants */}
      <div className="grid gap-6 lg:grid-cols-2">
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
