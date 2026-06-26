import { BackButton } from "@/components/admin/back-button";

/**
 * En-tête de page admin unifié : (retour) + titre (+ badge) + description,
 * et actions à droite. Utilisé sur toutes les pages du back-office.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  badge,
  actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {backHref && <BackButton fallback={backHref} label={backLabel} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
