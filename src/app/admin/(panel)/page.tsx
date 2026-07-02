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
  Database,
  Server,
  HardDrive,
  Globe,
} from "lucide-react";
import { getAnalytics } from "@/server/db/queries/analytics";
import {
  getDatabaseStats,
  getSiteConnections,
  DB_QUOTA_BYTES,
} from "@/server/db/queries/system";
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
import { formatNumber, formatDuration, formatBytes } from "@/lib/format";

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

/** Ligne « libellé → identifiant » d'une connexion (masquée si valeur absente). */
function ConnRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {/* min-w-0 : sans lui, la valeur mono longue refuse de rétrécir et déborde
          sur la tuile voisine au lieu d'être tronquée. */}
      <span className="min-w-0 truncate font-mono" title={value}>
        {value}
      </span>
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
  const [d, dbStats] = await Promise.all([
    getAnalytics(range).catch(() => null),
    getDatabaseStats().catch(() => null),
  ]);
  const conn = getSiteConnections();

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

            {/* Pédagogie : ce que mesurent ces indicateurs et quoi faire s'ils virent
                à l'orange/rouge. Replié par défaut pour garder la carte lisible. */}
            <details className="border-t border-border pt-3">
              <summary className="cursor-pointer select-none text-xs text-muted-foreground transition-colors hover:text-foreground">
                Comprendre ces indicateurs
              </summary>
              <dl className="mt-3 grid gap-3 text-xs leading-relaxed text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">
                    Chargement (LCP) — cible &lt; 2,5 s
                  </dt>
                  <dd>
                    Temps avant que l&apos;élément principal (souvent la grande
                    photo) s&apos;affiche. S&apos;il est orange/rouge : photos trop
                    lourdes ou connexion lente des visiteurs — vérifier le poids
                    des images téléversées.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">
                    Réactivité (INP) — cible &lt; 200 ms
                  </dt>
                  <dd>
                    Délai entre un tap/clic et la réaction visible de la page.
                    S&apos;il grimpe : des animations ou du code bloquent
                    l&apos;interaction — à signaler pour optimiser.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">
                    Stabilité (CLS) — cible &lt; 0,10
                  </dt>
                  <dd>
                    Mesure si la mise en page « saute » pendant le chargement
                    (contenu qui se décale sous le doigt). Souvent causé par des
                    images sans espace réservé.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Erreurs JS</dt>
                  <dd>
                    Plantages du site chez les visiteurs (une fonctionnalité qui
                    casse). L&apos;idéal est 0 : si des erreurs apparaissent,
                    transmettez les messages listés ci-dessus pour correction.
                  </dd>
                </div>
                <p className="border-t border-border pt-2">
                  Les valeurs affichées sont le <b>p75</b> : 75 % des visites font
                  mieux. Une seule visite lente ne fait donc pas basculer
                  l&apos;indicateur.
                </p>
              </dl>
            </details>
          </CardContent>
        </Card>
      </div>

      {/* Pages · Projets les plus consultés · Base de données */}
      <div className="grid gap-6 lg:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-primary" />
              Base de données
            </CardTitle>
            <CardDescription>
              Là où vivent vos photos, projets et statistiques
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!dbStats ? (
              <p className="text-sm text-muted-foreground">
                Informations indisponibles pour le moment.
              </p>
            ) : (
              (() => {
                const pct = dbStats.totalBytes / DB_QUOTA_BYTES;
                const slow = dbStats.pingMs > 300;
                const full = pct >= 0.8;
                const watch = pct >= 0.5 || slow;
                const rowsOf = (name: string) =>
                  dbStats.tables.find((t) => t.name === name)?.rows ?? 0;
                const inventory = [
                  { n: rowsOf("photos"), one: "photo", many: "photos" },
                  { n: rowsOf("projects"), one: "projet", many: "projets" },
                  { n: rowsOf("pricings"), one: "tarif", many: "tarifs" },
                  { n: rowsOf("visits"), one: "visite enregistrée", many: "visites enregistrées" },
                  { n: rowsOf("events"), one: "interaction suivie", many: "interactions suivies" },
                ].filter((i) => i.n > 0);
                return (
                  <>
                    {/* État en une phrase, sans jargon */}
                    <p className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          full ? "bg-red-500" : watch ? "bg-amber-500" : "bg-emerald-500",
                        )}
                      />
                      <span>
                        {full
                          ? "L'espace de stockage arrive à saturation — il faut faire du ménage (me le signaler)."
                          : watch
                            ? slow
                              ? "La base répond un peu lentement en ce moment ; si le site semble lent, réessayez plus tard."
                              : "L'espace de stockage se remplit — rien d'urgent, mais à surveiller."
                            : "Tout est en ordre : la base répond vite et l'espace est largement suffisant."}
                      </span>
                    </p>

                    {/* Espace utilisé : jauge + % — parlant sans connaître les octets */}
                    <div className="grid gap-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">Espace utilisé</span>
                        <span className="font-semibold tabular-nums">
                          {pct < 0.01 ? "moins de 1 %" : `${Math.round(pct * 100)} %`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            full ? "bg-red-500" : watch ? "bg-amber-500" : "bg-primary/70",
                          )}
                          style={{ width: `${Math.max(1, Math.min(100, pct * 100))}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(dbStats.totalBytes)} sur{" "}
                        {formatBytes(DB_QUOTA_BYTES)} disponibles.
                      </p>
                    </div>

                    {/* Inventaire en langage humain */}
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Ce qu&apos;elle contient
                      </p>
                      <ul className="grid gap-1.5 text-sm">
                        {inventory.map((i) => (
                          <li key={i.one} className="flex items-baseline gap-2">
                            <span className="font-semibold tabular-nums">
                              {formatNumber(i.n)}
                            </span>
                            <span className="text-muted-foreground">
                              {i.n > 1 ? i.many : i.one}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Chiffres bruts pour les curieux */}
                    <details className="border-t border-border pt-3">
                      <summary className="cursor-pointer select-none text-xs text-muted-foreground transition-colors hover:text-foreground">
                        Détails techniques
                      </summary>
                      <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
                        <p>Temps de réponse : {dbStats.pingMs} ms</p>
                        {dbStats.tables.slice(0, 6).map((tb) => (
                          <p key={tb.name} className="flex justify-between gap-2">
                            <span className="truncate">{tb.label}</span>
                            <span className="shrink-0 tabular-nums">
                              {formatBytes(tb.bytes)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </details>
                  </>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connexions du site — quels services, quels comptes (aucun secret affiché) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4 text-primary" />
            Connexions du site
          </CardTitle>
          <CardDescription>
            Les services sur lesquels repose le portfolio — identifiants
            uniquement, jamais de mots de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid min-w-0 content-start gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Server className="size-4 text-primary" />
                {conn.hosting.provider}
              </p>
              <p className="text-xs text-muted-foreground">
                Fait tourner le site et le met en ligne.
              </p>
              <div className="grid gap-1.5 border-t border-border pt-2">
                <ConnRow label="Environnement" value={conn.hosting.env} />
                <ConnRow label="Dépôt GitHub" value={conn.hosting.repo} />
                <ConnRow label="Version déployée" value={conn.hosting.commit} />
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Database className="size-4 text-primary" />
                {conn.database.provider}
              </p>
              <p className="text-xs text-muted-foreground">
                Stocke les textes, projets, réglages et statistiques.
              </p>
              <div className="grid gap-1.5 border-t border-border pt-2">
                <ConnRow label="Serveur" value={conn.database.host} />
                <ConnRow label="Base" value={conn.database.name} />
                <ConnRow label="Compte" value={conn.database.user} />
                <ConnRow label="Région" value={conn.database.region} />
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="size-4 text-primary" />
                {conn.storage.provider}
              </p>
              <p className="text-xs text-muted-foreground">
                Héberge les fichiers photos (originaux et variantes).
              </p>
              <div className="grid gap-1.5 border-t border-border pt-2">
                <ConnRow label="Bucket" value={conn.storage.bucket} />
                <ConnRow
                  label="Compte"
                  value={
                    conn.storage.account
                      ? `${conn.storage.account.slice(0, 8)}…`
                      : null
                  }
                />
                <ConnRow label="Diffusion" value={conn.storage.publicHost} />
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Globe className="size-4 text-primary" />
                Site public
              </p>
              <p className="text-xs text-muted-foreground">
                L&apos;adresse à laquelle les visiteurs accèdent au portfolio.
              </p>
              <div className="grid gap-1.5 border-t border-border pt-2">
                <ConnRow label="Domaine" value={conn.site.url} />
                <ConnRow label="URL du déploiement" value={conn.hosting.url} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
