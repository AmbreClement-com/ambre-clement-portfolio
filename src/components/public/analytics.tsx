"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/track";

function getOrCreate(store: Storage, key: string) {
  let v = store.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    store.setItem(key, v);
  }
  return v;
}

/**
 * Collecte anonyme (aucun cookie, aucune IP) :
 *  • pageview + temps passé (table `visits`) ;
 *  • clics sur les liens importants — tout élément portant `data-track="nom"`
 *    (écouteur DÉLÉGUÉ → aucun composant à câbler individuellement) ;
 *  • Web Vitals LCP / CLS / INP (santé perçue du site) ;
 *  • erreurs JS non interceptées (plafonnées par session, message tronqué).
 */
export function Analytics() {
  const pathname = usePathname();

  // Web Vitals → événements `vital:LCP|CLS|INP` (une mesure par chargement).
  useReportWebVitals((m) => {
    if (m.name === "LCP" || m.name === "CLS" || m.name === "INP") {
      track(`vital:${m.name}`, { value: m.value });
    }
  });

  // Clics importants (délégué, en capture → fonctionne aussi sur les liens _blank)
  // + erreurs JS (max 5/session pour ne pas inonder la table en cas de boucle).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("[data-track]");
      const name = el?.getAttribute("data-track");
      if (name) track(name);
    };
    let errorsLeft = 5;
    const onError = (e: ErrorEvent) => {
      if (errorsLeft-- <= 0) return;
      track("client_error", { meta: String(e.message ?? "erreur").slice(0, 300) });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (errorsLeft-- <= 0) return;
      const msg =
        e.reason instanceof Error ? e.reason.message : String(e.reason ?? "");
      track("client_error", { meta: `unhandledrejection: ${msg}`.slice(0, 300) });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    const visitorId = getOrCreate(localStorage, "ac_vid");
    const sessionId = getOrCreate(sessionStorage, "ac_sid");
    const id = crypto.randomUUID();
    const start = performance.now();

    fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        path: pathname,
        visitorId,
        sessionId,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {});

    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      const durationMs = Math.round(performance.now() - start);
      try {
        navigator.sendBeacon(
          "/api/track",
          new Blob([JSON.stringify({ id, durationMs })], {
            type: "application/json",
          }),
        );
      } catch {
        /* ignore */
      }
    };

    const onHide = () => document.visibilityState === "hidden" && send();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);

    return () => {
      send(); // changement de route → enregistre la durée de la page quittée
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
    };
  }, [pathname]);

  return null;
}
