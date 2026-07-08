"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "@/server/db/schema";

/**
 * Visionneuse plein écran. Montée à la demande (import dynamique) → framer-motion
 * n'alourdit pas le bundle initial des pages galerie.
 */
export function Lightbox({
  photos,
  index,
  setIndex,
}: {
  photos: Photo[];
  index: number;
  setIndex: (i: number | null) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setIndex(null), [setIndex]);
  const prev = useCallback(
    () => setIndex((index - 1 + photos.length) % photos.length),
    [index, photos.length, setIndex],
  );
  const next = useCallback(
    () => setIndex((index + 1) % photos.length),
    [index, photos.length, setIndex],
  );

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Tab") {
        const f = overlayRef.current?.querySelectorAll<HTMLElement>("button");
        if (!f || f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const t = setTimeout(
      () => overlayRef.current?.querySelector<HTMLElement>("button")?.focus(),
      0,
    );
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [close, prev, next]);

  const current = photos[index];

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${photos.length} : ${current.altText}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={close}
    >
      <button
        type="button"
        onClick={close}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/70 transition-colors hover:text-white"
        aria-label="Fermer"
      >
        <X className="size-6" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute left-2 z-10 rounded-full p-2 text-white/70 transition-colors hover:text-white md:left-6"
        aria-label="Précédent"
      >
        <ChevronLeft className="size-8" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute right-2 z-10 rounded-full p-2 text-white/70 transition-colors hover:text-white md:right-6"
        aria-label="Suivant"
      >
        <ChevronRight className="size-8" />
      </button>

      <figure
        className="flex max-h-[88vh] max-w-[92vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <picture>
          {current.variants.avif.length > 0 && (
            <source
              type="image/avif"
              srcSet={current.variants.avif.map((v) => `${v.url} ${v.width}w`).join(", ")}
              sizes="92vw"
            />
          )}
          {current.variants.webp.length > 0 && (
            <source
              type="image/webp"
              srcSet={current.variants.webp.map((v) => `${v.url} ${v.width}w`).join(", ")}
              sizes="92vw"
            />
          )}
          <img
            // Sans `sizes`, le navigateur suppose 100vw et charge la plus grande variante
            // (≈8 Mo) même sur un petit écran → lag/crash mobile. `sizes="92vw"` (largeur
            // réelle de la visionneuse) laisse le srcset choisir. Repli = variante moyenne
            // (~1080px) et non la plus grande, au cas où le srcset ne s'applique pas —
            // avec bascule webp→avif si un format manque (upload interrompu).
            src={
              (current.variants.webp.find((v) => v.width >= 1080) ??
                current.variants.webp.at(-1) ??
                current.variants.avif.at(-1))?.url
            }
            alt={current.altText}
            className="max-h-[80vh] w-auto object-contain"
          />
        </picture>
        <figcaption className="text-xs tracking-wide text-white/60">
          {index + 1} / {photos.length}
        </figcaption>
      </figure>
    </motion.div>
  );
}
