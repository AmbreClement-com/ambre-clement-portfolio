/** Activité par heure (0–23, heure de Paris). Met en valeur l'heure de pointe. */
export function HourlyBars({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  const hasData = hours.some((h) => h > 0);

  return (
    <div className="grid gap-2">
      <div className="flex h-28 items-end gap-[3px]">
        {hours.map((c, h) => (
          <div
            key={h}
            className="group relative flex flex-1 items-end"
            title={`${h}h — ${c} vue(s)`}
          >
            <div
              className={
                "w-full rounded-t transition-colors " +
                (h === peak && c > 0
                  ? "bg-primary"
                  : "bg-primary/30 group-hover:bg-primary/60")
              }
              style={{ height: `${Math.max(c > 0 ? 6 : 2, (c / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>0 h</span>
        <span>6 h</span>
        <span>12 h</span>
        <span>18 h</span>
        <span>23 h</span>
      </div>
      {hasData ? (
        <p className="text-xs text-muted-foreground">
          Heure de pointe : <span className="font-medium text-foreground">{peak} h</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Pas encore de données.</p>
      )}
    </div>
  );
}
