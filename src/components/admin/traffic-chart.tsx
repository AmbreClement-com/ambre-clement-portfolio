"use client";

import { useMemo, useRef, useState } from "react";
import { formatDayShort, formatNumber } from "@/lib/format";

type Point = { date: string; views: number; visitors: number };

const W = 820;
const H = 280;
const PAD = { top: 16, right: 14, bottom: 26, left: 14 };

export function TrafficChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = data.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.views));

  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const { areaPath, viewsLine, visitorsLine } = useMemo(() => {
    const line = (key: "views" | "visitors") =>
      data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`)
        .join(" ");
    const vl = line("views");
    const area =
      n > 0
        ? `${vl} L ${x(n - 1).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`
        : "";
    return { areaPath: area, viewsLine: vl, visitorsLine: line("visitors") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, max]);

  // Repères horizontaux (4 lignes).
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: Math.round(max * f),
    yy: y(max * f),
  }));

  // Étiquettes de dates (≈ 7 réparties).
  const labelStep = Math.max(1, Math.ceil(n / 7));

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / plotW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const hv = hover != null ? data[hover] : null;

  return (
    <div className="relative" ref={ref}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Courbe de fréquentation"
      >
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.yy}
              y2={t.yy}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={i === ticks.length - 1 ? "0" : "3 4"}
              opacity={0.7}
            />
            <text
              x={W - PAD.right}
              y={t.yy - 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {formatNumber(t.v)}
            </text>
          </g>
        ))}

        {/* Aire + lignes */}
        <path d={areaPath} fill="url(#traffic-fill)" />
        <path
          d={viewsLine}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={visitorsLine}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={1.6}
          strokeOpacity={0.55}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Étiquettes X */}
        {data.map((d, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={d.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {formatDayShort(d.date)}
            </text>
          ) : null,
        )}

        {/* Survol */}
        {hv && hover != null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--foreground)"
              strokeWidth={1}
              strokeOpacity={0.25}
            />
            <circle cx={x(hover)} cy={y(hv.views)} r={4} fill="var(--primary)" />
            <circle
              cx={x(hover)}
              cy={y(hv.visitors)}
              r={3}
              fill="var(--background)"
              stroke="var(--foreground)"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {/* Légende */}
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full bg-primary" /> Vues
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-foreground/60" />{" "}
          Visiteurs
        </span>
      </div>

      {/* Tooltip */}
      {hv && hover != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform:
              hover > n / 2 ? "translateX(-110%)" : "translateX(10%)",
          }}
        >
          <div className="mb-1 font-medium text-foreground">
            {formatDayShort(hv.date)}
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="size-2 rounded-full bg-primary" />
            {formatNumber(hv.views)} vues
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full border border-foreground/60" />
            {formatNumber(hv.visitors)} visiteurs
          </div>
        </div>
      )}
    </div>
  );
}
