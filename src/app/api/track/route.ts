import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { visits } from "@/server/db/schema";

export const runtime = "nodejs";

/**
 * Collecte de visites anonymes (aucune donnée personnelle, pas d'IP).
 *  - pageview : { id, path, visitorId, sessionId, referrer? } → insert
 *  - durée    : { id, durationMs }                            → update
 * Le corps peut venir d'un fetch JSON ou d'un navigator.sendBeacon.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.slice(0, 64) : null;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    // Mise à jour de durée
    if (typeof body.durationMs === "number") {
      const duration = Math.max(0, Math.min(body.durationMs, 1000 * 60 * 60));
      await db
        .update(visits)
        .set({ durationMs: Math.round(duration) })
        .where(eq(visits.id, id));
      return NextResponse.json({ ok: true });
    }

    // Nouveau pageview
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : null;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
    if (!path || !visitorId || !sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const referrer =
      typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null;

    await db
      .insert(visits)
      .values({ id, path, visitorId, sessionId, referrer })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
