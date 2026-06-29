"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Scroll fluide (inertie) Lenis — MÊME réglage que les pages projet
 * (`PhotosScroller` : lerp 0.09). À monter sur les pages de contenu (ex. Tarifs)
 * pour obtenir exactement le même ressenti de défilement. Repli sobre si
 * `prefers-reduced-motion`.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.09 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
