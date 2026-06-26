"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getOrCreate(store: Storage, key: string) {
  let v = store.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    store.setItem(key, v);
  }
  return v;
}

/** Collecte anonyme des visites (pageview + temps passé). Aucun cookie, aucune IP. */
export function Analytics() {
  const pathname = usePathname();

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
