import { and, gte, lt, eq, isNotNull, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { visits, events, projects } from "@/server/db/schema";

const DAY = 86_400_000;

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

function startOfDay(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * DAY);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Agrégats d'une fenêtre temporelle [start, end). */
async function windowAgg(start: Date, end: Date) {
  const [r] = await db
    .select({
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${visits.visitorId})::int`,
      sessions: sql<number>`count(distinct ${visits.sessionId})::int`,
      avgDuration: sql<number>`coalesce(round(avg(${visits.durationMs}) filter (where ${visits.durationMs} > 0)), 0)::int`,
    })
    .from(visits)
    .where(and(gte(visits.createdAt, start), lt(visits.createdAt, end)));
  return {
    views: Number(r?.views ?? 0),
    visitors: Number(r?.visitors ?? 0),
    sessions: Number(r?.sessions ?? 0),
    avgDuration: Number(r?.avgDuration ?? 0),
  };
}

/** Taux de rebond : part des sessions à une seule page vue. */
async function bounceRate(start: Date, end: Date) {
  const sc = db
    .select({ c: sql<number>`count(*)`.as("c") })
    .from(visits)
    .where(and(gte(visits.createdAt, start), lt(visits.createdAt, end)))
    .groupBy(visits.sessionId)
    .as("sc");
  const [r] = await db
    .select({
      total: sql<number>`count(*)::int`,
      bounced: sql<number>`count(*) filter (where ${sc.c} = 1)::int`,
    })
    .from(sc);
  const total = Number(r?.total ?? 0);
  return total > 0 ? Number(r?.bounced ?? 0) / total : 0;
}

/** Nombre de visiteurs dont la toute première visite (jamais) tombe dans la fenêtre. */
async function newVisitorCount(start: Date, end: Date) {
  const fs = db
    .select({ first: sql<Date>`min(${visits.createdAt})`.as("first") })
    .from(visits)
    .groupBy(visits.visitorId)
    .as("fs");
  const [r] = await db
    .select({
      n: sql<number>`count(*) filter (where ${fs.first} >= ${start} and ${fs.first} < ${end})::int`,
    })
    .from(fs);
  return Number(r?.n ?? 0);
}

function hostOf(ref: string | null): string {
  if (!ref) return "";
  try {
    return new URL(ref).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Nom lisible d'une source de trafic (regroupe les hôtes d'une même plateforme). */
function sourceLabel(host: string): string {
  if (/(^|\.)instagram\.com$/.test(host)) return "Instagram";
  if (/(^|\.)(google\.[a-z.]+)$/.test(host)) return "Google";
  if (/(^|\.)(linkedin\.com|lnkd\.in)$/.test(host)) return "LinkedIn";
  if (/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com)$/.test(host)) return "Facebook";
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host)) return "Pinterest";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "X (Twitter)";
  if (/(^|\.)bing\.com$/.test(host)) return "Bing";
  return host;
}

export async function getAnalytics(rangeDays: number) {
  const range: AnalyticsRange = (
    ANALYTICS_RANGES as readonly number[]
  ).includes(rangeDays)
    ? (rangeDays as AnalyticsRange)
    : 30;

  const now = new Date();
  const start = startOfDay(range - 1);
  const prevStart = new Date(start.getTime() - range * DAY);

  const siteHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host.replace(
        /^www\./,
        "",
      );
    } catch {
      return "";
    }
  })();

  const [
    cur,
    prev,
    bounce,
    prevBounce,
    newVisitors,
    daily,
    topPages,
    refRows,
    recentRow,
    clickRows,
    vitalRows,
    errAgg,
    errRecent,
    topProjRows,
  ] = await Promise.all([
    windowAgg(start, now),
    windowAgg(prevStart, start),
    bounceRate(start, now),
    bounceRate(prevStart, start),
    newVisitorCount(start, now),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${visits.createdAt}), 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${visits.visitorId})::int`,
      })
      .from(visits)
      .where(gte(visits.createdAt, start))
      .groupBy(sql`date_trunc('day', ${visits.createdAt})`),
    // Pages du SITE (hors fiches projet → carte « Projets » dédiée, complémentaire).
    db
      .select({
        path: visits.path,
        views: sql<number>`count(*)::int`,
        avgDuration: sql<number>`coalesce(round(avg(${visits.durationMs}) filter (where ${visits.durationMs} > 0)), 0)::int`,
      })
      .from(visits)
      .where(
        and(gte(visits.createdAt, start), sql`${visits.path} not like '/projects/%'`),
      )
      .groupBy(visits.path)
      .orderBy(desc(sql`count(*)`))
      .limit(7),
    db
      .select({ referrer: visits.referrer, c: sql<number>`count(*)::int` })
      .from(visits)
      .where(and(gte(visits.createdAt, start), isNotNull(visits.referrer)))
      .groupBy(visits.referrer),
    // Visiteurs uniques aujourd'hui / 7 j / 30 j — INDÉPENDANT du range sélectionné.
    db
      .select({
        today: sql<number>`count(distinct ${visits.visitorId}) filter (where ${visits.createdAt} >= ${startOfDay(0)})::int`,
        viewsToday: sql<number>`count(*) filter (where ${visits.createdAt} >= ${startOfDay(0)})::int`,
        week: sql<number>`count(distinct ${visits.visitorId}) filter (where ${visits.createdAt} >= ${startOfDay(6)})::int`,
        month: sql<number>`count(distinct ${visits.visitorId})::int`,
      })
      .from(visits)
      .where(gte(visits.createdAt, startOfDay(29))),
    // Clics sur les liens importants — période courante + précédente (delta).
    db
      .select({
        name: events.name,
        count: sql<number>`count(*) filter (where ${events.createdAt} >= ${start})::int`,
        prevCount: sql<number>`count(*) filter (where ${events.createdAt} < ${start})::int`,
      })
      .from(events)
      .where(
        and(
          gte(events.createdAt, prevStart),
          sql`${events.name} not like 'vital:%'`,
          sql`${events.name} <> 'client_error'`,
        ),
      )
      .groupBy(events.name)
      .orderBy(desc(sql`count(*) filter (where ${events.createdAt} >= ${start})`)),
    // Web Vitals : p75 par métrique sur la période (le standard de mesure terrain).
    db
      .select({
        name: events.name,
        p75: sql<number>`percentile_cont(0.75) within group (order by ${events.value})`,
      })
      .from(events)
      .where(
        and(
          gte(events.createdAt, start),
          sql`${events.name} like 'vital:%'`,
          isNotNull(events.value),
        ),
      )
      .groupBy(events.name),
    // Erreurs JS : volume sur la période + sessions touchées.
    db
      .select({
        count: sql<number>`count(*)::int`,
        sessions: sql<number>`count(distinct ${events.sessionId})::int`,
      })
      .from(events)
      .where(and(gte(events.createdAt, start), eq(events.name, "client_error"))),
    db
      .select({ meta: events.meta, path: events.path, at: events.createdAt })
      .from(events)
      .where(and(gte(events.createdAt, start), eq(events.name, "client_error")))
      .orderBy(desc(events.createdAt))
      .limit(5),
    // Projets les plus consultés (fiches /projects/slug).
    db
      .select({
        path: visits.path,
        views: sql<number>`count(*)::int`,
        avgDuration: sql<number>`coalesce(round(avg(${visits.durationMs}) filter (where ${visits.durationMs} > 0)), 0)::int`,
      })
      .from(visits)
      .where(
        and(gte(visits.createdAt, start), sql`${visits.path} like '/projects/%'`),
      )
      .groupBy(visits.path)
      .orderBy(desc(sql`count(*)`))
      .limit(7),
  ]);

  // Titres des projets consultés (slug → titre réel).
  const projSlugs = topProjRows
    .map((r) => r.path.split("/")[2] ?? "")
    .filter(Boolean);
  const titleRows = projSlugs.length
    ? await db
        .select({ slug: projects.slug, title: projects.title })
        .from(projects)
        .where(inArray(projects.slug, projSlugs))
    : [];
  const titleBySlug = new Map(titleRows.map((t) => [t.slug, t.title]));

  // Série quotidienne complète (jours vides à 0).
  const map = new Map(daily.map((d) => [d.day, d]));
  const series: { date: string; views: number; visitors: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const key = startOfDay(i).toISOString().slice(0, 10);
    const row = map.get(key);
    series.push({
      date: key,
      views: Number(row?.views ?? 0),
      visitors: Number(row?.visitors ?? 0),
    });
  }

  // Sources de trafic : plateformes regroupées (Instagram, Google…), reste en
  // « Direct / interne ».
  const extern = new Map<string, number>();
  for (const r of refRows) {
    const h = hostOf(r.referrer);
    if (!h || h === siteHost) continue; // interne ou illisible → direct
    const label = sourceLabel(h);
    extern.set(label, (extern.get(label) ?? 0) + Number(r.c));
  }
  const referredExternal = [...extern.values()].reduce((a, b) => a + b, 0);
  const sources = [
    { label: "Direct / interne", count: Math.max(0, cur.views - referredExternal) },
    ...[...extern.entries()].map(([label, count]) => ({ label, count })),
  ]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Web Vitals p75 (null si aucune mesure encore collectée).
  const vitalBy = new Map(vitalRows.map((v) => [v.name, Number(v.p75)]));
  const vitals = {
    lcp: vitalBy.get("vital:LCP") ?? null,
    cls: vitalBy.get("vital:CLS") ?? null,
    inp: vitalBy.get("vital:INP") ?? null,
  };

  return {
    range,
    totals: {
      views: cur.views,
      visitors: cur.visitors,
      sessions: cur.sessions,
      avgDuration: cur.avgDuration,
      bounce,
      newVisitors,
      returningVisitors: Math.max(0, cur.visitors - newVisitors),
      pagesPerSession: cur.sessions > 0 ? cur.views / cur.sessions : 0,
    },
    prev: {
      views: prev.views,
      visitors: prev.visitors,
      avgDuration: prev.avgDuration,
      bounce: prevBounce,
    },
    series,
    topPages: topPages.map((t) => ({
      path: t.path,
      views: Number(t.views),
      avgDuration: Number(t.avgDuration),
    })),
    topProjects: topProjRows.map((t) => {
      const slug = t.path.split("/")[2] ?? "";
      return {
        path: t.path,
        title: titleBySlug.get(slug) ?? slug.replace(/-/g, " "),
        views: Number(t.views),
        avgDuration: Number(t.avgDuration),
      };
    }),
    sources,
    // Visiteurs uniques récents — indépendants du range sélectionné.
    recent: {
      today: Number(recentRow[0]?.today ?? 0),
      viewsToday: Number(recentRow[0]?.viewsToday ?? 0),
      week: Number(recentRow[0]?.week ?? 0),
      month: Number(recentRow[0]?.month ?? 0),
    },
    clicks: clickRows.map((c) => ({
      name: c.name,
      count: Number(c.count),
      prevCount: Number(c.prevCount),
    })),
    vitals,
    errors: {
      count: Number(errAgg[0]?.count ?? 0),
      sessions: Number(errAgg[0]?.sessions ?? 0),
      recent: errRecent.map((e) => ({
        message: e.meta ?? "Erreur inconnue",
        path: e.path,
        at: e.at,
      })),
    },
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
