"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { FrameMeta } from "@/components/public/frame-context";
import type { Pricing } from "@/server/db/schema";

const pad = (n: number) => String(n).padStart(2, "0");

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(RM_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );
}

/** Bloc de contenu d'un tarif : photo à gauche, texte à droite. */
function TarifBlock({ p, priority }: { p: Pricing; priority?: boolean }) {
  const paragraphs = (p.intro ?? "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="grid w-full items-center gap-8 md:grid-cols-2 md:gap-12">
      {/* PHOTO (gauche) — cadre type polaroïd */}
      <div>
        {p.image ? (
          <div className="mx-auto w-full max-w-sm border border-neutral-900 bg-white p-2 shadow-[0_24px_70px_-25px_rgba(0,0,0,0.4)]">
            <ResponsiveImage
              variants={p.image.variants}
              alt={p.title}
              width={p.image.width}
              height={p.image.height}
              lqip={p.image.lqip}
              priority={priority}
              sizes="(max-width: 768px) 80vw, 38vw"
              className="h-auto w-full"
            />
          </div>
        ) : (
          <div className="mx-auto flex aspect-[3/4] w-full max-w-sm items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-400">
            Aucune image
          </div>
        )}
      </div>

      {/* TEXTE (droite) */}
      <div className="text-neutral-900">
        <h2 className="text-2xl font-light uppercase tracking-wide md:text-4xl">
          {p.title}
        </h2>
        {p.subtitle && (
          <p className="mt-2 text-sm font-medium text-neutral-600">
            {p.subtitle}
          </p>
        )}
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="mt-4 max-w-prose text-sm font-light leading-relaxed text-neutral-700"
          >
            {para}
          </p>
        ))}
        {p.includes.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium">La séance comprend :</p>
            <ul className="mt-2 grid gap-1 text-sm font-light text-neutral-700">
              {p.includes.map((it, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-neutral-400">·</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.price && (
          <p className="mt-6 inline-block bg-neutral-100 px-5 py-3 text-sm font-medium uppercase tracking-wide">
            {p.price}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Cinéma des tarifs — MÊME mécanique que le cinéma des projets (défilement
 * fondu + dolly, bande de vignettes à gauche, grand numéro à droite, snap),
 * mais chaque « slide » affiche le CONTENU COMPLET du tarif (pas de clic).
 */
export function TarifsCinema({ pricings }: { pricings: Pricing[] }) {
  const n = pricings.length;
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reduced || n === 0) return;
    const STEP = 66; // hauteur vignette + écart
    const lenis = new Lenis({ lerp: 0.08 });
    lenisRef.current = lenis;
    let raf = 0;
    let last = -1;

    const loop = (t: number) => {
      lenis.raf(t);
      const wrap = wrapRef.current;
      if (wrap) {
        const vh = window.innerHeight;
        const total = wrap.offsetHeight - vh;
        const rectTop = wrap.getBoundingClientRect().top;
        const traveled = Math.min(Math.max(-rectTop, 0), total);
        const af = total > 0 ? (traveled / total) * (n - 1) : 0;

        const layers = layerRefs.current;
        for (let i = 0; i < layers.length; i++) {
          const el = layers[i];
          if (!el) continue;
          const d = af - i;
          const ad = Math.min(Math.abs(d), 1);
          el.style.opacity = String(1 - ad);
          el.style.transform = `scale(${(1 + d * 0.06).toFixed(4)})`;
          el.style.zIndex = String(100 - Math.round(ad * 100));
          el.style.pointerEvents = ad < 0.5 ? "auto" : "none";
        }

        if (stripRef.current) {
          stripRef.current.style.transform = `translateY(${(
            vh / 2 -
            (af + 0.5) * STEP
          ).toFixed(2)}px)`;
        }

        const ai = Math.round(af);
        if (ai !== last) {
          last = ai;
          setActive(ai);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    let idle: ReturnType<typeof setTimeout>;
    const snap = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const total = wrap.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const rectTop = wrap.getBoundingClientRect().top;
      const traveled = Math.min(Math.max(-rectTop, 0), total);
      const af = (traveled / total) * (n - 1);
      const target = Math.round(af);
      if (Math.abs(af - target) < 0.012) return;
      const desired = (target / (n - 1)) * total;
      lenis.scrollTo(window.scrollY + rectTop + desired, { duration: 0.6 });
    };
    const onScroll = () => {
      clearTimeout(idle);
      idle = setTimeout(snap, 140);
    };
    lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced, n]);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    const lenis = lenisRef.current;
    if (!wrap || !lenis) return;
    const total = wrap.offsetHeight - window.innerHeight;
    const rectTop = wrap.getBoundingClientRect().top;
    const desired = n > 1 ? (i / (n - 1)) * total : 0;
    lenis.scrollTo(window.scrollY + rectTop + desired, { duration: 1.1 });
  };

  // ---- Repli accessible (reduced-motion) : tarifs empilés ----
  if (reduced) {
    return (
      <main className="min-h-[100svh] w-full bg-white px-6 pb-24 pt-24 md:px-12">
        <FrameMeta title="Tarifs" count={n} />
        <div className="mx-auto grid max-w-5xl gap-20">
          {pricings.map((p, i) => (
            <TarifBlock key={p.id} p={p} priority={i === 0} />
          ))}
        </div>
      </main>
    );
  }

  return (
    // Hauteur = n écrans → marge de défilement ; la scène est "sticky".
    <div ref={wrapRef} style={{ height: `${n * 100}vh` }} className="relative bg-white">
      <FrameMeta title="Tarifs" count={n} current={active + 1} />
      <div className="sticky top-0 h-screen overflow-hidden bg-white text-neutral-900">
        {/* Couches (fondu + dolly) — chaque couche = un tarif complet */}
        <div className="absolute inset-0">
          {pricings.map((p, i) => (
            <div
              key={p.id}
              ref={(el) => {
                layerRefs.current[i] = el;
              }}
              className="absolute inset-0 flex items-center justify-center px-6 will-change-[opacity,transform] md:px-24"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <div className="w-full max-w-4xl">
                <TarifBlock p={p} priority={i === 0} />
              </div>
            </div>
          ))}
        </div>

        {/* Bande de vignettes (gauche) */}
        <div className="pointer-events-none absolute left-0 top-0 hidden h-screen w-40 overflow-hidden md:block">
          <div ref={stripRef} className="absolute left-16 will-change-transform">
            {pricings.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Aller au tarif ${p.title}`}
                className={`pointer-events-auto mb-[10px] block h-14 w-20 overflow-hidden border bg-neutral-100 transition-all duration-300 ${
                  i === active
                    ? "border-neutral-900 opacity-100"
                    : "border-transparent opacity-35 hover:opacity-70"
                }`}
              >
                {p.image && (
                  <ResponsiveImage
                    variants={p.image.variants}
                    alt={p.title}
                    width={p.image.width}
                    height={p.image.height}
                    sizes="80px"
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Grand numéro (droite) */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 md:block md:right-8">
          <div className="font-mono text-6xl font-light leading-none tabular-nums text-neutral-900">
            {pad(active + 1)}
          </div>
        </div>
      </div>
    </div>
  );
}
