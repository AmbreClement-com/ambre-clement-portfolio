/** Mini bar chart sans dépendance, barres en couleur d'accent (--primary). */
export function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-44 items-stretch gap-1.5">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex flex-1 flex-col items-center gap-1.5"
          title={`${d.date} : ${d.count} vue(s)`}
        >
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-primary/80 transition-colors hover:bg-primary"
              style={{
                height: `${(d.count / max) * 100}%`,
                minHeight: d.count > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="text-[9px] tabular-nums text-muted-foreground">
            {d.date.slice(8)}
          </span>
        </div>
      ))}
    </div>
  );
}
