import Link from "next/link";
import {
  FolderOpen,
  PencilLine,
  Images,
  Layers,
  TrendingUp,
  BarChart3,
  Plus,
  Eye,
  Users,
  Clock,
  LogOut,
  Radio,
  Repeat,
  Clock3,
  Gauge,
} from "lucide-react";
import { getAnalytics } from "@/server/db/queries/analytics";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { KpiCard } from "@/components/admin/kpi-card";
import { RangeSelector } from "@/components/admin/range-selector";
import { StatDonut } from "@/components/admin/stat-donut";
import { HourlyBars } from "@/components/admin/hourly-bars";
import { ResetAnalyticsButton } from "@/components/admin/reset-analytics-button";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { formatNumber, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtPath(p: string) {
  return p === "/" ? "Accueil" : p;
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

  const content = [
    { label: "Projets publiés", value: d.content.published, icon: FolderOpen },
    { label: "Brouillons", value: d.content.drafts, icon: PencilLine },
    { label: "Photos", value: d.content.photos, icon: Images },
    { label: "Onglets", value: d.content.categories, icon: Layers },
  ];

  const topMax = d.topPages[0]?.views || 1;
  const srcMax = d.sources[0]?.count || 1;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Suivi de l'activité du site en temps quasi réel."
        actions={
          <div className="flex items-center gap-2">
            <RangeSelector current={d.range} />
            <ResetAnalyticsButton />
          </div>
        }
      />

      {/* KPIs avec tendance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Vues"
          value={formatNumber(t.views)}
          current={t.views}
          previous={d.prev.views}
          icon={Eye}
        />
        <KpiCard
          label="Visiteurs uniques"
          value={formatNumber(t.visitors)}
          current={t.visitors}
          previous={d.prev.visitors}
          icon={Users}
        />
        <KpiCard
          label="Durée moy. / visite"
          value={t.avgDuration > 0 ? formatDuration(t.avgDuration) : "—"}
          current={t.avgDuration}
          previous={d.prev.avgDuration}
          icon={Clock}
          hint="Pas assez de données"
        />
        <KpiCard
          label="Taux de rebond"
          value={`${Math.round(t.bounce * 100)} %`}
          current={t.bounce * 100}
          previous={d.prev.bounce * 100}
          icon={LogOut}
          invert
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

      {/* Sources · Nouveaux/récurrents · Heures de pointe */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4 text-primary" />
              Sources de trafic
            </CardTitle>
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
              <Repeat className="size-4 text-primary" />
              Nouveaux vs récurrents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {t.visitors === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun visiteur.</p>
            ) : (
              <StatDonut
                centerLabel={`${formatNumber(t.visitors)} visiteurs`}
                segments={[
                  {
                    label: "Nouveaux",
                    value: t.newVisitors,
                    color: "var(--primary)",
                  },
                  {
                    label: "Récurrents",
                    value: t.returningVisitors,
                    color: "var(--foreground)",
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4 text-primary" />
              Heures de pointe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyBars hours={d.hours} />
          </CardContent>
        </Card>
      </div>

      {/* Top pages · Engagement */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Pages les plus vues
            </CardTitle>
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
              <Gauge className="size-4 text-primary" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              { label: "Sessions", value: formatNumber(t.sessions) },
              {
                label: "Pages / session",
                value: t.pagesPerSession.toFixed(1).replace(".", ","),
              },
              {
                label: "Durée moyenne",
                value: t.avgDuration > 0 ? formatDuration(t.avgDuration) : "—",
              },
              {
                label: "Taux de rebond",
                value: `${Math.round(t.bounce * 100)} %`,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                <span className="font-semibold tabular-nums">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Contenu */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {content.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <s.icon className="size-4 text-primary" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Raccourcis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raccourcis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="size-4" /> Nouveau projet
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/categories">
              <Layers className="size-4" /> Gérer les onglets
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="size-4" /> Voir le site
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
