import { Database, Server, HardDrive, Globe, HeartPulse } from "lucide-react";
import { getAnalytics } from "@/server/db/queries/analytics";
import {
  getDatabaseStats,
  getSiteConnections,
  DB_QUOTA_BYTES,
  STORAGE_QUOTA_BYTES,
} from "@/server/db/queries/system";
import { getStorageUsage } from "@/server/images/storage";
import { RangeSelector } from "@/components/admin/range-selector";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeRaw } = await searchParams;
  const range = Number(rangeRaw) || 30;
  const [d, dbStats, storageUsage] = await Promise.all([
    getAnalytics(range).catch(() => null),
    getDatabaseStats().catch(() => null),
    getStorageUsage().catch(() => null),
  ]);
  const conn = getSiteConnections();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Système"
        description="Santé technique du site : performances, stockage et services connectés."
        actions={d ? <RangeSelector current={d.range} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
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
            {!d ? (
              <p className="text-sm text-muted-foreground">
                Informations indisponibles pour le moment.
              </p>
            ) : (
              <>
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
                  display={
                    d.vitals.inp != null ? `${Math.round(d.vitals.inp)} ms` : "—"
                  }
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
                        Temps avant que l&apos;élément principal (souvent la
                        grande photo) s&apos;affiche. S&apos;il est orange/rouge
                        : photos trop lourdes ou connexion lente des visiteurs —
                        vérifier le poids des images téléversées.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">
                        Réactivité (INP) — cible &lt; 200 ms
                      </dt>
                      <dd>
                        Délai entre un tap/clic et la réaction visible de la
                        page. S&apos;il grimpe : des animations ou du code
                        bloquent l&apos;interaction — à signaler pour optimiser.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">
                        Stabilité (CLS) — cible &lt; 0,10
                      </dt>
                      <dd>
                        Mesure si la mise en page « saute » pendant le
                        chargement (contenu qui se décale sous le doigt).
                        Souvent causé par des images sans espace réservé.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Erreurs JS</dt>
                      <dd>
                        Plantages du site chez les visiteurs (une fonctionnalité
                        qui casse). L&apos;idéal est 0 : si des erreurs
                        apparaissent, transmettez les messages listés ci-dessus
                        pour correction.
                      </dd>
                    </div>
                    <p className="border-t border-border pt-2">
                      Les valeurs affichées sont le <b>p75</b> : 75 % des
                      visites font mieux. Une seule visite lente ne fait donc
                      pas basculer l&apos;indicateur.
                    </p>
                  </dl>
                </details>
              </>
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
                  {
                    n: rowsOf("visits"),
                    one: "visite enregistrée",
                    many: "visites enregistrées",
                  },
                  {
                    n: rowsOf("events"),
                    one: "interaction suivie",
                    many: "interactions suivies",
                  },
                ].filter((i) => i.n > 0);
                return (
                  <>
                    {/* État en une phrase, sans jargon */}
                    <p className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          full
                            ? "bg-red-500"
                            : watch
                              ? "bg-amber-500"
                              : "bg-emerald-500",
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
                        <span className="text-muted-foreground">
                          Espace utilisé
                        </span>
                        <span className="font-semibold tabular-nums">
                          {pct < 0.01
                            ? "moins de 1 %"
                            : `${Math.round(pct * 100)} %`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            full
                              ? "bg-red-500"
                              : watch
                                ? "bg-amber-500"
                                : "bg-primary/70",
                          )}
                          style={{
                            width: `${Math.max(1, Math.min(100, pct * 100))}%`,
                          }}
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
                          <p
                            key={tb.name}
                            className="flex justify-between gap-2"
                          >
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-4 text-primary" />
              Stockage des photos
            </CardTitle>
            <CardDescription>
              L&apos;espace où sont conservés les fichiers de vos photos
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!storageUsage ? (
              <p className="text-sm text-muted-foreground">
                Informations indisponibles pour le moment.
              </p>
            ) : (
              (() => {
                const pct = storageUsage.bytes / STORAGE_QUOTA_BYTES;
                const full = pct >= 0.8;
                const watch = pct >= 0.5;
                return (
                  <>
                    {/* État en une phrase, sans jargon */}
                    <p className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          // jamais rouge : dépasser n'est pas une panne, juste quelques centimes
                          watch ? "bg-amber-500" : "bg-emerald-500",
                        )}
                      />
                      <span>
                        {full
                          ? "L'espace gratuit approche de sa limite — le site continuera de fonctionner normalement, mais un petit surcoût apparaîtra (détails ci-dessous)."
                          : watch
                            ? "L'espace gratuit se remplit — rien d'urgent, le site fonctionne normalement."
                            : "Tout est en ordre : vos photos occupent une petite partie de l'espace gratuit."}
                      </span>
                    </p>

                    {/* Jauge + % du palier gratuit */}
                    <div className="grid gap-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">
                          Espace utilisé
                        </span>
                        <span className="font-semibold tabular-nums">
                          {pct < 0.01
                            ? "moins de 1 %"
                            : `${Math.round(pct * 100)} %`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            watch ? "bg-amber-500" : "bg-primary/70",
                          )}
                          style={{
                            width: `${Math.max(1, Math.min(100, pct * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(storageUsage.bytes)} sur{" "}
                        {formatBytes(STORAGE_QUOTA_BYTES)} gratuits ·{" "}
                        {formatNumber(storageUsage.objects)} fichiers (vos
                        photos et leurs versions optimisées).
                      </p>
                    </div>

                    {/* Pédagogie : que se passe-t-il en cas de dépassement ? */}
                    <details className="border-t border-border pt-3">
                      <summary className="cursor-pointer select-none text-xs text-muted-foreground transition-colors hover:text-foreground">
                        Que se passe-t-il si l&apos;espace gratuit est dépassé ?
                      </summary>
                      <div className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-foreground">
                        <p>
                          <b className="text-foreground">
                            Rien ne s&apos;arrête.
                          </b>{" "}
                          Le site reste en ligne, aucune photo n&apos;est
                          supprimée, et vous pouvez continuer à en ajouter.
                        </p>
                        <p>
                          Au-delà de l&apos;espace gratuit, l&apos;hébergeur des
                          photos (Cloudflare) facture simplement le surplus :
                          environ <b className="text-foreground">2 centimes
                          par mois pour chaque gigaoctet</b> en plus, prélevés
                          sur la carte enregistrée sur le compte Cloudflare.
                          Exemple : 15 Go stockés ≈ 0,08 € par mois.
                        </p>
                        <p>
                          Pour donner un ordre de grandeur : l&apos;espace
                          gratuit permet de stocker plusieurs milliers de
                          photos. Le suivi précis et les factures se trouvent
                          sur le tableau de bord Cloudflare (section R2).
                        </p>
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
