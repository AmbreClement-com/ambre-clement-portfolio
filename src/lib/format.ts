/** Formate un nombre avec séparateurs de milliers (fr-FR). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

/** Formate une durée en millisecondes → « 1 min 23 s » / « 45 s ». */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem} s`;
  return `${m} min ${rem.toString().padStart(2, "0")} s`;
}

/** Date ISO (YYYY-MM-DD) → « JJ/MM ». */
export function formatDayShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
