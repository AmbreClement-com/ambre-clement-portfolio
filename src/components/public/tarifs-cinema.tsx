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
import { pageZoom } from "@/lib/page-zoom";
import { claimScroll } from "@/lib/scroll-owner";
import { useStripScrub } from "@/components/public/strip-scrub";
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
    <div className="h-full w-full md:h-auto">
      {/* ── MOBILE : le texte prime, la photo est un petit accent haut-droite ──
          L'EN-TÊTE (titre + sous-titre + photo + filet) reste FIXE ; seul le
          CORPS (paragraphes, prestations, tarif) défile en interne — le texte
          en trop passe DERRIÈRE la bande de vignettes du bas. Arrivé au bout,
          le geste suivant chaîne sur le document → tarif suivant (snap). */}
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-light uppercase leading-[1.05] tracking-wide text-neutral-900">
              {p.title}
            </h2>
            {p.subtitle && (
              <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-700">
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

        <div className="mt-6 h-px w-full shrink-0 bg-neutral-200" />

        {/* Corps défilant (seule zone scrollable) — padding bas généreux pour que
            les dernières lignes puissent remonter AU-DESSUS du fondu blanc et de
            la bande de vignettes qui recouvrent le bas de l'écran. */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-44">
        {paragraphs.length > 0 && (
          <div className="mt-5 space-y-3">
            {/* Registre des mentions légales : noir pur + graisse normale (lisibilité). */}
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-[15px] font-normal leading-relaxed text-black"
              >
                {para}
              </p>
            ))}
          </div>
        )}

        {p.includes.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black">
              La séance comprend
            </p>
            <ul className="mt-3 space-y-1.5">
              {p.includes.map((it, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[15px] font-normal leading-relaxed text-black"
                >
                  <span aria-hidden className="shrink-0 text-neutral-400">
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black">
              Tarif
            </span>
            <span className="text-right text-base font-normal tracking-wide text-black">
              {p.price}
            </span>
          </div>
        )}
        </div>
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
            <p className="mt-2 text-sm font-medium text-neutral-800">
              {p.subtitle}
            </p>
          )}
          {/* Registre des mentions légales : noir pur + graisse normale (lisibilité). */}
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="mt-4 max-w-prose text-[15px] font-normal leading-relaxed text-black sm:text-base"
            >
              {para}
            </p>
          ))}
          {p.includes.length > 0 && (
            <div className="mt-5">
              <p className="text-base font-medium text-black">La séance comprend :</p>
              <ul className="mt-2 grid gap-1 text-[15px] font-normal text-black sm:text-base">
                {p.includes.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-neutral-500">·</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.price && (
            <p className="mt-6 inline-block bg-neutral-100 px-5 py-3 text-sm font-medium uppercase tracking-wide text-black">
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
  // TACTILE : course réduite par tarif + snap CSS natif (même mécanique que le cinéma
  // projets — cf. projects-cinema.tsx). Desktop inchangé (100vh + snap JS Lenis).
  const touch = useIsTouch();
  const stepVh = touch ? 60 : 100;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const mStripRef = useRef<HTMLDivElement | null>(null); // rail horizontal (mobile)
  const lenisRef = useRef<Lenis | null>(null);
  // true pendant un scrub de la bande mobile → le snap natif est suspendu.
  const snapPauseRef = useRef(false);

  useEffect(() => {
    if (reduced || n === 0) return;
    const STEP = 66; // hauteur vignette + écart
    // lerp élevé (avant 0.08) = inertie courte → pas de "glisse" entre deux tarifs.
    const lenis = new Lenis({ lerp: 0.2 });
    lenisRef.current = lenis;
    const releaseScroll = claimScroll(); // retire le lissage global (SmoothScroll)
    let raf = 0;
    let last = -1;

    let lastAf = -1;
    let lastVh = -1;
    let lastVw = -1;
    const loop = (t: number) => {
      lenis.raf(t);
      const wrap = wrapRef.current;
      if (wrap) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const total = wrap.offsetHeight - vh;
        const rectTop = wrap.getBoundingClientRect().top;
        const traveled = Math.min(Math.max(-rectTop, 0), total);
        const af = total > 0 ? (traveled / total) * (n - 1) : 0;

        // PERF : à l'arrêt (af inchangé), aucune réécriture de styles par frame.
        if (af === lastAf && vh === lastVh && vw === lastVw) {
          raf = requestAnimationFrame(loop);
          return;
        }
        lastAf = af;
        lastVh = vh;
        lastVw = vw;

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

        // Rail horizontal mobile : centre la vignette du tarif actif (suit le
        // scroll — même mécanique que le cinéma projets). Pas mesuré → suit la
        // taille réelle des vignettes.
        const mStrip = mStripRef.current;
        const firstThumb = mStrip?.firstElementChild as HTMLElement | null;
        if (mStrip && firstThumb) {
          const stepX = firstThumb.offsetWidth + 6; // + gap-1.5
          mStrip.style.transform = `translateX(${(
            vw / 2 -
            (af + 0.5) * stepX
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
    // Snap JS = desktop uniquement ; au tactile le scroll-snap CSS natif recale.
    if (!touch) lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      releaseScroll();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced, n, touch]);

  // TACTILE : snap natif + marqueurs alignés en px sur les paliers réels (sinon, en vh,
  // ils divergent d'`innerHeight` quand la barre Safari iOS se replie → snap à côté du
  // palier). Snap SUSPENDU pendant les transitions (pageZoom < 1) : le snap `mandatory`
  // vise les positions TRANSFORMÉES et re-scrollait le document en plein zoom → la scène
  // sticky sortait du petit cadre. Même mécanique que le cinéma projets.
  useEffect(() => {
    if (reduced || n === 0 || !touch) return;
    const el = document.documentElement;
    const wrap = wrapRef.current;
    const place = () => {
      if (!wrap) return;
      const total = wrap.offsetHeight - window.innerHeight;
      wrap
        .querySelectorAll<HTMLElement>("[data-cinema-snap]")
        .forEach((m, k) => {
          if (k === n - 1) return; // le dernier reste ancré en bas (align "end")
          m.style.top = `${n > 1 ? (k / (n - 1)) * total : 0}px`;
        });
    };
    place();
    window.addEventListener("resize", place);
    let raf = 0;
    const tick = () => {
      // Suspendu aussi pendant un scrub de la bande de vignettes (strip-scrub).
      const want = pageZoom.value >= 0.999 && !snapPauseRef.current;
      if (el.classList.contains("ac-snap-y") !== want)
        el.classList.toggle("ac-snap-y", want);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      el.classList.remove("ac-snap-y");
    };
  }, [reduced, n, touch]);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    const lenis = lenisRef.current;
    if (!wrap || !lenis) return;
    const total = wrap.offsetHeight - window.innerHeight;
    const rectTop = wrap.getBoundingClientRect().top;
    const desired = n > 1 ? (i / (n - 1)) * total : 0;
    const top = window.scrollY + rectTop + desired;
    // Tactile : scroll natif (le snap CSS accompagne) ; desktop : Lenis (inchangé).
    if (touch) window.scrollTo({ top, behavior: "smooth" });
    else lenis.scrollTo(top, { duration: 1.1 });
  };

  // Bande mobile « scrubbable » : glisser = naviguer entre tarifs, taper =
  // aller au tarif. Vertical natif intact (texte interne + snap du cinéma).
  const mBandRef = useStripScrub({
    wrapRef,
    stripRef: mStripRef,
    n,
    goTo,
    snapPauseRef,
  });

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
    // Hauteur = 1 écran + (n-1) pas ; la scène est "sticky". Desktop : pas de 100vh
    // (identique à avant) ; tactile : pas réduit (cf. stepVh).
    <div
      ref={wrapRef}
      style={{ height: `calc(100vh + ${(n - 1) * stepVh}vh)` }}
      className="relative bg-white"
    >
      {/* Marqueurs de snap natif (tactile) : un par tarif, aux paliers exacts.
          Le DERNIER est ancré au BAS de la course (align "end") : sa cible reste
          juste quelle que soit la hauteur du viewport (barre Safari iOS repliée
          ou non) — sinon le snap « remontait » la dernière slide toute seule. */}
      {touch &&
        Array.from({ length: n }, (_, k) =>
          k === n - 1 ? (
            <div
              key={k}
              aria-hidden
              data-cinema-snap
              className="absolute bottom-0 left-0 h-px w-px"
              style={{ scrollSnapAlign: "end" }}
            />
          ) : (
            <div
              key={k}
              aria-hidden
              data-cinema-snap
              className="absolute left-0 h-px w-px"
              style={{ top: `${k * stepVh}vh`, scrollSnapAlign: "start" }}
            />
          ),
        )}
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
              // pt-36 mobile : les repères d'angle du cadre sont à 104-120px ; le
              // contenu démarre 24px dessous — même respiration qu'aux côtés.
              className="absolute inset-0 flex items-start justify-center overflow-hidden px-11 pb-0 pt-36 will-change-[opacity,transform] md:items-center md:overflow-visible md:px-16 md:py-0 lg:px-24"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {/* MOBILE : l'en-tête du tarif reste FIXE, seul le CORPS scrolle en
                  interne (cf. TarifBlock) — la slide descend jusqu'en bas de
                  l'écran (pb-0) pour que le texte passe DERRIÈRE la bande de
                  vignettes. En fin de texte, le geste CHAÎNE sur le scroll du
                  document → le snap enchaîne sur le tarif suivant, exactement
                  comme le cinéma projets. Desktop : inchangé (tout tient à l'écran). */}
              <div className="h-full w-full max-w-4xl overflow-hidden md:h-auto md:overflow-visible">
                <TarifBlock p={p} priority={i === 0} />
              </div>
            </div>
          ))}
        </div>

        {/* Bande de vignettes (gauche) — lg+ uniquement : entre 768 et 1024px elle
            chevauchait la photo (contenu en px-16/24) → bande du bas à la place. */}
        <div className="pointer-events-none absolute left-0 top-0 hidden h-screen w-40 overflow-hidden lg:block">
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

        {/* Fondu blanc au-dessus de la bande de vignettes (mobile) : le corps du
            tarif défile DERRIÈRE mais s'estompe avant la zone des vignettes —
            aucun texte ne se mélange jamais au slider. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[105] h-44 bg-gradient-to-t from-white from-65% to-transparent md:hidden"
        />

        {/* Bande de vignettes horizontale (mobile) — RAIL translaté centré sur le
            tarif actif (même mécanique que le cinéma projets) + SCRUBBABLE :
            glisser la bande navigue entre les tarifs, taper une vignette y va
            (cf. strip-scrub). `touch-action: pan-y` : le geste vertical reste
            100 % natif. Au-dessus du fondu (z-110 > fondu z-105 > slides ≤100),
            posée À L'INTÉRIEUR du cadre (au-dessus des repères bottom-12). */}
        <div
          ref={mBandRef}
          style={{ touchAction: "pan-y" }}
          className="absolute inset-x-0 bottom-16 z-[110] h-16 overflow-hidden md:bottom-8 lg:hidden"
        >
          <div
            ref={mStripRef}
            className="absolute bottom-5 left-0 flex gap-1.5 will-change-transform"
          >
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
