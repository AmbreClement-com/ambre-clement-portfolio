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

const TOUCH_QUERY = "(pointer: coarse)";
function useIsTouch() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(TOUCH_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}

/**
 * Bloc de contenu d'un tarif.
 *  • MOBILE (< md) : édito « texte d'abord » — petite photo en haut à droite,
 *    en regard du titre ; le texte occupe toute la largeur, ponctué de filets
 *    et de labels mono (même grammaire que le cadre/HUD du site). La position
 *    dans le cinéma s'affiche dans le CADRE (haut droite), comme les projets.
 *  • DESKTOP (md+) : inchangé — photo à gauche, texte à droite.
 */
function TarifBlock({ p, priority }: { p: Pricing; priority?: boolean }) {
  const paragraphs = (p.intro ?? "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="w-full">
      {/* ── MOBILE : le texte prime, la photo est un petit accent haut-droite ── */}
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-[2rem] font-light uppercase leading-[1.05] tracking-wide text-neutral-900">
              {p.title}
            </h2>
            {p.subtitle && (
              <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                {p.subtitle}
              </p>
            )}
          </div>
          {p.image && (
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)]">
              <ResponsiveImage
                variants={p.image.variants}
                alt={p.title}
                width={p.image.width}
                height={p.image.height}
                lqip={p.image.lqip}
                priority={priority}
                sizes="96px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="mt-6 h-px w-full bg-neutral-200" />

        {paragraphs.length > 0 && (
          <div className="mt-5 space-y-3">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-[13px] font-light leading-relaxed text-neutral-700"
              >
                {para}
              </p>
            ))}
          </div>
        )}

        {p.includes.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              La séance comprend
            </p>
            <ul className="mt-3 space-y-1.5">
              {p.includes.map((it, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[13px] font-light leading-relaxed text-neutral-800"
                >
                  <span aria-hidden className="shrink-0 text-neutral-300">
                    —
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.price && (
          <div className="mt-7 flex items-baseline justify-between gap-4 border-y border-neutral-200 py-3.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              Tarif
            </span>
            <span className="text-right text-base font-light tracking-wide text-neutral-900">
              {p.price}
            </span>
          </div>
        )}
      </div>

      {/* ── DESKTOP (md+) : photo à gauche, texte à droite — inchangé ── */}
      <div className="hidden w-full items-center gap-12 md:grid md:grid-cols-2">
        <div>
          {p.image ? (
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden shadow-[0_24px_70px_-25px_rgba(0,0,0,0.4)]">
              <ResponsiveImage
                variants={p.image.variants}
                alt={p.title}
                width={p.image.width}
                height={p.image.height}
                lqip={p.image.lqip}
                priority={priority}
                sizes="38vw"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="mx-auto flex aspect-[3/4] w-full max-w-sm items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-400">
              Aucune image
            </div>
          )}
        </div>

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
  // TACTILE : le cinéma (slides à hauteur d'écran FIXE, overflow-hidden) COUPE le texte
  // des tarifs longs sur téléphone. On bascule donc sur une PILE éditoriale en scroll
  // natif (cf. TarifsStack, rendu plus bas) : tout le texte est toujours lisible.
  // Le cinéma (fondu + dolly + snap Lenis) reste l'expérience desktop.
  const touch = useIsTouch();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reduced || n === 0 || touch) return; // tactile → TarifsStack (pas de cinéma)
    const STEP = 66; // hauteur vignette + écart
    // lerp élevé (avant 0.08) = inertie courte → pas de "glisse" entre deux tarifs.
    const lenis = new Lenis({ lerp: 0.2 });
    lenisRef.current = lenis;
    let raf = 0;
    let last = -1;

    let lastAf = -1;
    let lastVh = -1;
    const loop = (t: number) => {
      lenis.raf(t);
      const wrap = wrapRef.current;
      if (wrap) {
        const vh = window.innerHeight;
        const total = wrap.offsetHeight - vh;
        const rectTop = wrap.getBoundingClientRect().top;
        const traveled = Math.min(Math.max(-rectTop, 0), total);
        const af = total > 0 ? (traveled / total) * (n - 1) : 0;

        // PERF : à l'arrêt (af inchangé), aucune réécriture de styles par frame.
        if (af === lastAf && vh === lastVh) {
          raf = requestAnimationFrame(loop);
          return;
        }
        lastAf = af;
        lastVh = vh;

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
      // Recalage quasi instantané (avant : 0.6s → impression de flottement).
      lenis.scrollTo(window.scrollY + rectTop + desired, { duration: 0.14 });
    };
    const onScroll = () => {
      clearTimeout(idle);
      // Dès que le scroll ralentit, on recale IMMÉDIATEMENT au lieu d'attendre la fin de
      // l'inertie → plus de temps mort "coincé" entre deux tarifs.
      idle = setTimeout(snap, Math.abs(lenis.velocity) < 5 ? 0 : 40);
    };
    lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced, n, touch]);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    const lenis = lenisRef.current;
    if (!wrap || !lenis) return;
    const total = wrap.offsetHeight - window.innerHeight;
    const rectTop = wrap.getBoundingClientRect().top;
    const desired = n > 1 ? (i / (n - 1)) * total : 0;
    lenis.scrollTo(window.scrollY + rectTop + desired, { duration: 1.1 });
  };

  // ---- TACTILE : pile éditoriale en scroll natif (tout le texte lisible) ----
  if (touch && !reduced && n > 0) {
    return <TarifsStack pricings={pricings} />;
  }

  // ---- Repli accessible (reduced-motion) : tarifs empilés ----
  if (reduced) {
    return (
      <main className="min-h-[100svh] w-full bg-white px-11 pb-24 pt-32 md:px-12 md:pt-24">
        <FrameMeta title="Tarifs" count={n} unit="Tarifs" />
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
      {/* Compteur du cadre (haut droite) = « (01 / 03) », comme le cinéma projets. */}
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
              className="absolute inset-0 flex items-start justify-center overflow-hidden px-11 pb-32 pt-28 will-change-[opacity,transform] md:items-center md:overflow-visible md:px-24 md:py-0"
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

        {/* Bande de vignettes horizontale (mobile) — navigation entre tarifs. Relevée
            AU-DESSUS des repères de coin du cadre (bottom-12 + size-4 → jusqu'à 64px) :
            elle se pose ainsi clairement À L'INTÉRIEUR du cadre. */}
        <div className="absolute inset-x-0 bottom-20 flex justify-center px-4 md:hidden">
          <div className="flex max-w-[92vw] gap-1.5 overflow-x-auto pb-1">
            {pricings.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Aller au tarif ${p.title}`}
                className={`h-9 w-12 shrink-0 overflow-hidden border bg-neutral-100 transition-all duration-300 ${
                  i === active
                    ? "border-neutral-900 opacity-100"
                    : "border-neutral-300 opacity-45"
                }`}
              >
                {p.image && (
                  <ResponsiveImage
                    variants={p.image.variants}
                    alt={p.title}
                    width={p.image.width}
                    height={p.image.height}
                    sizes="48px"
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TACTILE — pile éditoriale en scroll natif : chaque tarif est une SECTION pleine
 * (le cinéma à hauteur d'écran fixe coupait le texte des tarifs longs sur téléphone).
 * Le compteur du cadre « (01 / 03) » suit la section la plus visible (scroll-spy).
 */
function TarifsStack({ pricings }: { pricings: Pricing[] }) {
  const n = pricings.length;
  const [active, setActive] = useState(0);
  const secRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Section active = celle qui traverse la bande CENTRALE de l'écran (10 % de haut).
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = secRefs.current.indexOf(e.target as HTMLElement);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    secRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="w-full bg-white px-11 pb-24 pt-28">
      <FrameMeta title="Tarifs" count={n} current={active + 1} />
      <div className="mx-auto grid max-w-xl gap-12">
        {pricings.map((p, i) => (
          <section
            key={p.id}
            ref={(el) => {
              secRefs.current[i] = el;
            }}
            className={i > 0 ? "border-t border-neutral-200 pt-12" : undefined}
          >
            <TarifBlock p={p} priority={i === 0} />
          </section>
        ))}
      </div>
    </main>
  );
}
