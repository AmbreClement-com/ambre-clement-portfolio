"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Rend une bande de vignettes (cinémas projets/tarifs, mobile) « scrubbable » :
 * GLISSER horizontalement la bande fait défiler les éléments (on pilote le
 * scroll du document — la mécanique existante suit : fondus, rail, HUD), puis
 * on se RECALE sur l'élément le plus proche au relâcher (goTo). TAPER une
 * vignette continue de naviguer (le clic n'est avalé qu'après un vrai drag).
 *
 * Le scroll vertical de base est intact : `touch-action: pan-y` sur la bande
 * laisse le navigateur gérer le geste vertical ; on ne capture (preventDefault)
 * que lorsque le geste est clairement horizontal. Pendant le scrub, le snap
 * natif est suspendu via `snapPauseRef` (lu par la boucle du cinéma) — sinon il
 * se battrait contre notre pilotage du scroll.
 *
 * Retourne la ref à poser sur le CONTENEUR de la bande (avec
 * `style={{ touchAction: "pan-y" }}`). Listeners natifs non-passifs : React
 * attache ses touch events en passif → son preventDefault serait ignoré.
 */
export function useStripScrub({
  wrapRef,
  stripRef,
  n,
  goTo,
  snapPauseRef,
  gap = 6,
}: {
  /** Conteneur pleine hauteur du cinéma (n×100vh) — la course de scroll. */
  wrapRef: RefObject<HTMLDivElement | null>;
  /** Rail translaté contenant les vignettes (1er enfant = vignette type). */
  stripRef: RefObject<HTMLDivElement | null>;
  n: number;
  goTo: (i: number) => void;
  /** Posé à true pendant le scrub → la boucle du cinéma retire `ac-snap-y`. */
  snapPauseRef: RefObject<boolean>;
  /** Écart entre vignettes (px) — doit suivre le `gap-*` du rail. */
  gap?: number;
}) {
  const bandRef = useRef<HTMLDivElement | null>(null);
  // goTo change à chaque rendu (closure) → ref pour ne pas ré-attacher les
  // listeners (mise à jour en effet, jamais pendant le rendu).
  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });

  useEffect(() => {
    const band = bandRef.current;
    if (!band || n < 2) return;

    type Drag = { x: number; y: number; scroll: number; mode: "idle" | "h" | "v" };
    let drag: Drag | null = null;
    let justDragged = 0; // timestamp du dernier drag → avale le clic qui suit

    const bounds = () => {
      const wrap = wrapRef.current;
      if (!wrap) return null;
      const total = wrap.offsetHeight - window.innerHeight;
      if (total <= 0) return null;
      const base = wrap.getBoundingClientRect().top + window.scrollY;
      return { base, total };
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      drag = { x: t.clientX, y: t.clientY, scroll: window.scrollY, mode: "idle" };
    };

    const onMove = (e: TouchEvent) => {
      if (!drag) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.x;
      const dy = t.clientY - drag.y;
      if (drag.mode === "idle") {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // pas encore décidé
        drag.mode = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (drag.mode === "h") snapPauseRef.current = true;
      }
      if (drag.mode !== "h") return; // vertical → 100 % natif (scroll de base)
      e.preventDefault();
      const b = bounds();
      const first = stripRef.current?.firstElementChild as HTMLElement | null;
      if (!b || !first) return;
      // 1 vignette de glissement = 1 pas de cinéma (sens : rail suit le doigt).
      const stepX = first.offsetWidth + gap;
      const stepScroll = b.total / (n - 1);
      const target = drag.scroll - (dx / stepX) * stepScroll;
      window.scrollTo(0, Math.min(b.base + b.total, Math.max(b.base, target)));
    };

    const onEnd = () => {
      const wasH = drag?.mode === "h";
      drag = null;
      if (!wasH) {
        snapPauseRef.current = false;
        return;
      }
      justDragged = performance.now();
      const b = bounds();
      if (b) {
        const traveled = Math.min(Math.max(window.scrollY - b.base, 0), b.total);
        const af = (traveled / b.total) * (n - 1);
        goToRef.current(Math.max(0, Math.min(n - 1, Math.round(af))));
      }
      // le snap reprend après le recalage (goTo anime via scroll natif/snap CSS)
      snapPauseRef.current = false;
    };

    // Après un drag, le navigateur peut émettre un clic sur la vignette sous le
    // doigt → on l'avale (un TAP sans mouvement passe, lui, normalement).
    const onClick = (e: MouseEvent) => {
      if (performance.now() - justDragged < 400) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    band.addEventListener("touchstart", onStart, { passive: true });
    band.addEventListener("touchmove", onMove, { passive: false });
    band.addEventListener("touchend", onEnd);
    band.addEventListener("touchcancel", onEnd);
    band.addEventListener("click", onClick, true);
    return () => {
      band.removeEventListener("touchstart", onStart);
      band.removeEventListener("touchmove", onMove);
      band.removeEventListener("touchend", onEnd);
      band.removeEventListener("touchcancel", onEnd);
      band.removeEventListener("click", onClick, true);
      snapPauseRef.current = false;
    };
  }, [n, wrapRef, stripRef, snapPauseRef, gap]);

  return bandRef;
}
