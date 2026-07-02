/**
 * Envoi d'un ÉVÉNEMENT analytics anonyme (clic sur un lien important, Web Vital,
 * erreur JS). Mêmes identifiants anonymes que les pageviews (`visits`) — aucun
 * cookie, aucune IP. Best-effort : `sendBeacon` (survit à la fermeture de page),
 * repli fetch keepalive, échec silencieux.
 */
export function track(
  name: string,
  opts: { value?: number; meta?: string } = {},
) {
  try {
    const visitorId = localStorage.getItem("ac_vid");
    const sessionId = sessionStorage.getItem("ac_sid");
    const body = JSON.stringify({
      type: "event",
      id: crypto.randomUUID(),
      name: name.slice(0, 80),
      path: location.pathname.slice(0, 300),
      visitorId,
      sessionId,
      value: typeof opts.value === "number" ? opts.value : undefined,
      meta: opts.meta?.slice(0, 300),
    });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      fetch("/api/track", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }
  } catch {
    /* jamais bloquant */
  }
}
