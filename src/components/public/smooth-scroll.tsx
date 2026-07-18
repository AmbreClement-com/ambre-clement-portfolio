"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { hasScrollOwner, onScrollOwnersChange } from "@/lib/scroll-owner";

/**
 * Lissage de scroll GLOBAL (inertie douce à la molette/trackpad) pour les pages
 * sans mécanique propre (mentions légales, etc.). Le tactile reste 100 % natif
 * (Lenis ne détourne pas le touch par défaut) → aucune latence ajoutée sur mobile.
 * Se retire automatiquement quand une page possède déjà son Lenis (galerie WebGL,
 * cinémas — cf. scroll-owner) et respecte prefers-reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: Lenis | null = null;
    let raf = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({ lerp: 0.12 });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!lenis) return;
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenis = null;
    };

    const sync = () => (hasScrollOwner() ? stop() : start());
    sync();
    const unsub = onScrollOwnersChange(sync);
    return () => {
      unsub();
      stop();
    };
  }, []);

  return null;
}
