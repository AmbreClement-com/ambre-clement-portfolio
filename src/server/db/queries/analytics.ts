import { and, gte, lt, isNotNull, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { visits, projects, photos, categories } from "@/server/db/schema";

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
    hourRows,
    proj,
    ph,
    cat,
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
    db
      .select({
        path: visits.path,
        views: sql<number>`count(*)::int`,
        avgDuration: sql<number>`coalesce(round(avg(${visits.durationMs}) filter (where ${visits.durationMs} > 0)), 0)::int`,
      })
      .from(visits)
      .where(gte(visits.createdAt, start))
      .groupBy(visits.path)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({ referrer: visits.referrer, c: sql<number>`count(*)::int` })
      .from(visits)
      .where(and(gte(visits.createdAt, start), isNotNull(visits.referrer)))
      .groupBy(visits.referrer),
    db
      .select({
        h: sql<number>`extract(hour from (${visits.createdAt} at time zone 'UTC' at time zone 'Europe/Paris'))::int`,
        c: sql<number>`count(*)::int`,
      })
      .from(visits)
      .where(gte(visits.createdAt, start))
      .groupBy(
        sql`extract(hour from (${visits.createdAt} at time zone 'UTC' at time zone 'Europe/Paris'))`,
      ),
    db
      .select({
        total: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter (where ${projects.published})::int`,
      })
      .from(projects),
    db.select({ total: sql<number>`count(*)::int` }).from(photos),
    db.select({ total: sql<number>`count(*)::int` }).from(categories),
  ]);

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

  // Sources de trafic : externes par domaine, le reste en « Direct / interne ».
  const extern = new Map<string, number>();
  for (const r of refRows) {
    const h = hostOf(r.referrer);
    if (!h || h === siteHost) continue; // interne ou illisible → direct
    extern.set(h, (extern.get(h) ?? 0) + Number(r.c));
  }
  const referredExternal = [...extern.values()].reduce((a, b) => a + b, 0);
  const sources = [
    { label: "Direct / interne", count: Math.max(0, cur.views - referredExternal) },
    ...[...extern.entries()].map(([label, count]) => ({ label, count })),
  ]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Activité par heure (0–23, heure de Paris).
  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of hourRows) {
    const h = Number(r.h);
    if (h >= 0 && h < 24) hours[h] = Number(r.c);
  }

  const projectsTotal = Number(proj[0]?.total ?? 0);
  const published = Number(proj[0]?.published ?? 0);

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
    sources,
    hours,
    content: {
      published,
      drafts: projectsTotal - published,
      photos: Number(ph[0]?.total ?? 0),
      categories: Number(cat[0]?.total ?? 0),
    },
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
