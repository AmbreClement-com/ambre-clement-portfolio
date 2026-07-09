"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "@/server/db/schema";

// Variante moyenne (~1080px) plutôt que la plus grande (cf. commentaire du <img>),
// avec bascule webp→avif si un format manque (upload interrompu).
function bestUrl(p: Photo) {
  return (
    p.variants.webp.find((v) => v.width >= 1080) ??
    p.variants.webp.at(-1) ??
    p.variants.avif.at(-1)
  )?.url;
}

// Effet « cube » (stories Instagram) : chaque photo est une FACE. La face qui
// entre pivote depuis le bord de l'écran (charnière sur son arête partagée avec
// la sortante) pendant que l'ensemble se translate — combiné à la perspective du
// conteneur, ça se lit comme un cube qui tourne. Les faces s'assombrissent
// quand elles sont de profil (les faces d'un vrai cube fuient la lumière).
const cubeVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    rotateY: dir > 0 ? 90 : -90,
    transformOrigin: dir > 0 ? "left center" : "right center",
    filter: "brightness(0.35)",
  }),
  center: { x: "0%", rotateY: 0, filter: "brightness(1)" },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    rotateY: dir > 0 ? -90 : 90,
    transformOrigin: dir > 0 ? "right center" : "left center",
    filter: "brightness(0.35)",
  }),
};

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

  // Sens de rotation du cube (1 = suivante, -1 = précédente) — posé AVANT le
  // changement d'index pour que les variantes enter/exit partent du bon côté.
  const [direction, setDirection] = useState(1);

  const close = useCallback(() => setIndex(null), [setIndex]);
  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, setIndex]);
  const next = useCallback(() => {
    setDirection(1);
    setIndex((index + 1) % photos.length);
  }, [index, photos.length, setIndex]);

  // Précharge les voisines : la face qui entre est déjà décodée quand le cube
  // tourne (sinon l'image « pope » en cours de rotation).
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      const url = bestUrl(photos[(i + photos.length) % photos.length]);
      if (url) new window.Image().src = url;
    });
  }, [index, photos]);

  // Verrou de scroll + focus — au MONTAGE uniquement (les flèches changent l'index
  // et ne doivent surtout pas re-capturer la position : Safari remet le scroll à 0
  // dès que `overflow: hidden` est posé, on relirait 0 au lieu de la vraie position).
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    const t = setTimeout(
      () => overlayRef.current?.querySelector<HTMLElement>("button")?.focus(),
      0,
    );
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      // Restaure explicitement la position de la galerie : Chrome la préserve,
      // mais Safari l'a remise à 0 avec l'overflow hidden → sans ça, la croix
      // ramène en haut de la galerie. `preventScroll` : le focus restauré ne
      // doit pas non plus déclencher de scrollIntoView.
      window.scrollTo(0, scrollY);
      restoreFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
        className="flex max-w-[92vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scène du cube : perspective 3D + faces superposées (absolute). */}
        <div
          className="relative h-[80vh] w-[92vw]"
          style={{ perspective: "1200px" }}
        >
          <AnimatePresence initial={false} custom={direction}>
            {/* Swipe tactile : la face se laisse glisser horizontalement
                (élastique), et un geste suffisant — en distance OU en vitesse —
                fait tourner le cube. `drag="x"` pose touch-action: pan-y → le
                geste vertical reste au navigateur. Désactivé à photo unique. */}
            <motion.div
              key={index}
              className="absolute inset-0 flex items-center justify-center"
              custom={direction}
              variants={cubeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              drag={photos.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -500) next();
                else if (info.offset.x > 60 || info.velocity.x > 500) prev();
              }}
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
                  // réelle de la visionneuse) laisse le srcset choisir. Repli : cf. bestUrl().
                  src={bestUrl(current)}
                  alt={current.altText}
                  draggable={false}
                  className="max-h-[80vh] max-w-full w-auto object-contain"
                />
              </picture>
            </motion.div>
          </AnimatePresence>
        </div>
        <figcaption className="text-xs tracking-wide text-white/60">
          {index + 1} / {photos.length}
        </figcaption>
      </figure>
    </motion.div>
  );
}
