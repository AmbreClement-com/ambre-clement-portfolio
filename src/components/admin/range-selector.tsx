import Link from "next/link";
import { cn } from "@/lib/utils";

const OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
];

/** Sélecteur de période (segmented control) — navigue via ?range=. */
export function RangeSelector({ current }: { current: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
      {OPTIONS.map((o) => {
        const active = o.days === current;
        return (
          <Link
            key={o.days}
            href={`/admin?range=${o.days}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
