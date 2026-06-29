import { formatNumber } from "@/lib/format";

type Segment = { label: string; value: number; color: string };

/** Donut SVG simple (sans dépendance). Couleurs passées en valeurs CSS. */
export function StatDonut({
  segments,
  centerLabel,
}: {
  segments: Segment[];
  centerLabel?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 130 130" className="size-32 shrink-0 -rotate-90">
        <circle
          cx="65"
          cy="65"
          r={R}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={14}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * C;
            const el = (
              <circle
                key={i}
                cx="65"
                cy="65"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={14}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
      </svg>
      <div className="grid gap-2">
        {centerLabel && (
          <div className="text-2xl font-semibold tabular-nums">
            {centerLabel}
          </div>
        )}
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums">
                {formatNumber(s.value)}{" "}
                <span className="text-muted-foreground">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
