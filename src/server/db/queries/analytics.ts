import { sql, desc, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { visits, projects, photos, categories } from "@/server/db/schema";

const DAY = 86_400_000;

function startOfDay(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * DAY);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardData() {
  const since14 = startOfDay(13);
  const since7 = startOfDay(6);

  // Fréquentation (7 derniers jours)
  const [week] = await db
    .select({
      visits: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${visits.visitorId})`,
    })
    .from(visits)
    .where(gte(visits.createdAt, since7));

  // Série quotidienne (14 j) pour le graphique
  const daily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${visits.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(*)`,
    })
    .from(visits)
    .where(gte(visits.createdAt, since14))
    .groupBy(sql`date_trunc('day', ${visits.createdAt})`);

  const topPages = await db
    .select({ path: visits.path, c: sql<number>`count(*)` })
    .from(visits)
    .where(gte(visits.createdAt, since14))
    .groupBy(visits.path)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // Contenu (toujours exact)
  const [p] = await db
    .select({
      total: sql<number>`count(*)`,
      published: sql<number>`count(*) filter (where ${projects.published})`,
    })
    .from(projects);
  const [ph] = await db.select({ total: sql<number>`count(*)` }).from(photos);
  const [cat] = await db.select({ total: sql<number>`count(*)` }).from(categories);

  const map = new Map(daily.map((d) => [d.day, Number(d.c)]));
  const series: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = startOfDay(i).toISOString().slice(0, 10);
    series.push({ date: key, count: map.get(key) ?? 0 });
  }

  const projectsTotal = Number(p?.total ?? 0);
  const published = Number(p?.published ?? 0);

  return {
    traffic: {
      visits7: Number(week?.visits ?? 0),
      visitors7: Number(week?.visitors ?? 0),
    },
    series,
    topPages: topPages.map((t) => ({ path: t.path, count: Number(t.c) })),
    content: {
      published,
      drafts: projectsTotal - published,
      photos: Number(ph?.total ?? 0),
      categories: Number(cat?.total ?? 0),
    },
  };
}
