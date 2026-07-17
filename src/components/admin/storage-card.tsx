import { HardDrive } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, formatBytes } from "@/lib/format";
import { STORAGE_QUOTA_BYTES } from "@/server/db/queries/system";

/**
 * Carte « Stockage des photos » : où on en est sur le palier gratuit R2,
 * en langage clair, avec l'explication de ce qui se passe en cas de dépassement.
 */
export function StorageCard({
  usage,
}: {
  usage: { bytes: number; objects: number } | null;
}) {
  return (
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
        {!usage ? (
          <p className="text-sm text-muted-foreground">
            Informations indisponibles pour le moment.
          </p>
        ) : (
          (() => {
            const pct = usage.bytes / STORAGE_QUOTA_BYTES;
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
                      {pct < 0.01 ? "moins de 1 %" : `${Math.round(pct * 100)} %`}
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
                    {formatBytes(usage.bytes)} sur{" "}
                    {formatBytes(STORAGE_QUOTA_BYTES)} gratuits ·{" "}
                    {formatNumber(usage.objects)} fichiers (vos photos et leurs
                    versions optimisées).
                  </p>
                </div>

                {/* Pédagogie : que se passe-t-il en cas de dépassement ? */}
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer select-none text-xs text-muted-foreground transition-colors hover:text-foreground">
                    Que se passe-t-il si l&apos;espace gratuit est dépassé ?
                  </summary>
                  <div className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <b className="text-foreground">Rien ne s&apos;arrête.</b>{" "}
                      Le site reste en ligne, aucune photo n&apos;est supprimée,
                      et vous pouvez continuer à en ajouter.
                    </p>
                    <p>
                      Au-delà de l&apos;espace gratuit, l&apos;hébergeur des
                      photos (Cloudflare) facture simplement le surplus :
                      environ{" "}
                      <b className="text-foreground">
                        2 centimes par mois pour chaque gigaoctet
                      </b>{" "}
                      en plus, prélevés sur la carte enregistrée sur le compte
                      Cloudflare. Exemple : 15 Go stockés ≈ 0,08 € par mois.
                    </p>
                    <p>
                      Pour donner un ordre de grandeur : l&apos;espace gratuit
                      permet de stocker plusieurs milliers de photos. Le suivi
                      précis et les factures se trouvent sur le tableau de bord
                      Cloudflare (section R2).
                    </p>
                  </div>
                </details>
              </>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
