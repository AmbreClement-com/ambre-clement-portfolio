"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (PWA). Ne rend RIEN → aucune incidence sur l'UI.
 * Silencieux en cas d'échec (navigateur non compatible, mode privé, etc.).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Après le chargement pour ne pas concurrencer le rendu initial.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
