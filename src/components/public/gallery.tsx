"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ResponsiveImage } from "@/components/public/responsive-image";
import type { Photo } from "@/server/db/schema";

// Chargée à la demande : framer-motion reste hors du bundle initial.
const Lightbox = dynamic(() => import("./lightbox").then((m) => m.Lightbox));

type Props = {
  photos: Photo[];
  variant?: "masonry" | "stack" | "scatter";
  emptyLabel?: string;
};

// Disposition éditoriale « en désordre » (largeur / alignement / décalage / inclinaison).
const SCATTER = [
  { w: "66%", a: "flex-start", x: "3%", r: -1.4, mt: "0rem" },
  { w: "48%", a: "flex-end", x: "-5%", r: 1.6, mt: "6rem" },
  { w: "82%", a: "center", x: "0%", r: 0, mt: "7rem" },
  { w: "44%", a: "flex-start", x: "9%", r: 2, mt: "3rem" },
  { w: "60%", a: "flex-end", x: "-3%", r: -1, mt: "8rem" },
  { w: "54%", a: "center", x: "-10%", r: 1.2, mt: "4rem" },
  { w: "72%", a: "flex-start", x: "1%", r: -2, mt: "7rem" },
  { w: "50%", a: "flex-end", x: "-7%", r: 1, mt: "5rem" },
] as const;

export function Gallery({ photos, variant = "masonry", emptyLabel }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const scatterRef = useRef<HTMLDivElement | null>(null);

  // Révélation au scroll pour la disposition scatter
  useEffect(() => {
    if (variant !== "scatter") return;
    const root = scatterRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [variant, photos.length]);

  if (photos.length === 0) {
    return (
      <p className="py-20 text-center text-neutral-500">
        {emptyLabel ?? "Aucune photo pour le moment."}
      </p>
    );
  }

  if (variant === "scatter") {
    return (
      <>
        <div ref={scatterRef} className="mx-auto flex max-w-5xl flex-col">
          {photos.map((photo, i) => {
            const s = SCATTER[i % SCATTER.length];
            return (
              <figure
                key={photo.id}
                style={{
                  width: s.w,
                  alignSelf: s.a,
                  transform: `translateX(${s.x}) rotate(${s.r}deg)`,
                  marginTop: i === 0 ? undefined : s.mt,
                }}
              >
                <button
                  type="button"
                  data-reveal
                  onClick={() => setIndex(i)}
                  aria-label={`Agrandir : ${photo.altText}`}
                  className="reveal-item group block w-full cursor-zoom-in overflow-hidden bg-neutral-100"
                >
                  <ResponsiveImage
                    variants={photo.variants}
                    alt={photo.altText}
                    width={photo.width}
                    height={photo.height}
                    lqip={photo.lqip}
                    sizes="(max-width: 768px) 90vw, 55vw"
                    className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </button>
              </figure>
            );
          })}
        </div>

        {index !== null && (
          <Lightbox photos={photos} index={index} setIndex={setIndex} />
        )}
      </>
    );
  }

  const isGrid = variant !== "stack";

  return (
    <>
      <div
        className={
          isGrid
            ? "grid grid-cols-2 gap-4 md:grid-cols-3"
            : "flex flex-col items-center gap-6"
        }
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setIndex(i)}
            className={
              isGrid
                ? "group block aspect-[3/4] cursor-zoom-in overflow-hidden bg-neutral-100"
                : "block w-full max-w-3xl cursor-zoom-in"
            }
            aria-label={`Agrandir : ${photo.altText}`}
          >
            <ResponsiveImage
              variants={photo.variants}
              alt={photo.altText}
              width={photo.width}
              height={photo.height}
              lqip={photo.lqip}
              priority={isGrid ? i < 3 : i === 0}
              sizes={
                isGrid
                  ? "(max-width: 768px) 50vw, 33vw"
                  : "(max-width: 768px) 100vw, 768px"
              }
              className={
                isGrid
                  ? "size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  : "h-auto w-full transition-opacity hover:opacity-90"
              }
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <Lightbox photos={photos} index={index} setIndex={setIndex} />
      )}
    </>
  );
}
