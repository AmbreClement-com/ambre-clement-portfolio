import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { visits, events } from "@/server/db/schema";

export const runtime = "nodejs";

/** Noms d'événements acceptés (whitelist stricte — évite toute pollution de la table). */
const EVENT_OK =
  /^(social:[a-z0-9_-]{1,32}|email_copy|contact_email|contact_phone|vital:(LCP|CLS|INP)|client_error)$/;

/**
 * Collecte de visites anonymes (aucune donnée personnelle, pas d'IP).
 *  - pageview  : { id, path, visitorId, sessionId, referrer? }           → insert visits
 *  - durée     : { id, durationMs }                                      → update visits
 *  - événement : { type:"event", id, name, path, value?, meta?, …ids }   → insert events
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
    // Événement (clic sur un lien important, Web Vital, erreur JS)
    if (body.type === "event") {
      const name = typeof body.name === "string" ? body.name : "";
      const path =
        typeof body.path === "string" ? body.path.slice(0, 300) : null;
      if (!EVENT_OK.test(name) || !path) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      await db
        .insert(events)
        .values({
          id,
          name,
          path,
          visitorId:
            typeof body.visitorId === "string"
              ? body.visitorId.slice(0, 64)
              : null,
          sessionId:
            typeof body.sessionId === "string"
              ? body.sessionId.slice(0, 64)
              : null,
          // vitals : ms (LCP/INP) ou score (CLS) — borné à 10 min par sécurité.
          value:
            typeof body.value === "number" && Number.isFinite(body.value)
              ? Math.max(0, Math.min(body.value, 1000 * 60 * 10))
              : null,
          meta: typeof body.meta === "string" ? body.meta.slice(0, 300) : null,
        })
        .onConflictDoNothing();
      return NextResponse.json({ ok: true });
    }

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
