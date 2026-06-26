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
} from "lucide-react";
import { getDashboardData } from "@/server/db/queries/analytics";
import { BarChart } from "@/components/admin/bar-chart";
import { ResetAnalyticsButton } from "@/components/admin/reset-analytics-button";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function fmtPath(p: string) {
  return p === "/" ? "Accueil" : p;
}

export default async function AdminDashboard() {
  const d = await getDashboardData().catch(() => null);

  if (!d) {
    return (
      <p className="text-muted-foreground">Tableau de bord indisponible.</p>
    );
  }

  const stats = [
    { label: "Projets publiés", value: d.content.published, icon: FolderOpen },
    { label: "Brouillons", value: d.content.drafts, icon: PencilLine },
    { label: "Photos", value: d.content.photos, icon: Images },
    { label: "Onglets", value: d.content.categories, icon: Layers },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title="Tableau de bord" />

      {/* Contenu — toujours exact */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fréquentation */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Fréquentation — 14 derniers jours
            </CardTitle>
            <ResetAnalyticsButton />
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex gap-8">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {d.traffic.visits7}
                </p>
                <p className="text-sm text-muted-foreground">Visites (7 j)</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {d.traffic.visitors7}
                </p>
                <p className="text-sm text-muted-foreground">
                  Visiteurs uniques (7 j)
                </p>
              </div>
            </div>
            <BarChart data={d.series} />
          </CardContent>
        </Card>

        {/* Pages les plus vues */}
        <Card>
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
              <ul className="grid gap-2.5">
                {d.topPages.map((t) => {
                  const max = d.topPages[0].count || 1;
                  return (
                    <li key={t.path} className="grid gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{fmtPath(t.path)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {t.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${(t.count / max) * 100}%` }}
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
