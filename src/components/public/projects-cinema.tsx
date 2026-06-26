"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { FrameMeta } from "@/components/public/frame-context";
import {
  openProject,
  consumeReturnSlug,
} from "@/components/public/project-transition";
import { ProjectTransitionMount } from "@/components/public/project-transition-mount";
import { pageZoom } from "@/lib/page-zoom";
import type { Photo, Project } from "@/server/db/schema";

// useLayoutEffect SSR-safe.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type P = Project & { photos: Photo[] };

const pad = (n: number) => String(n).padStart(2, "0");

function year(d: string | null) {
  if (!d) return null;
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

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

/**
 * Navigateur cinématique façon "viseur" : le scroll fait défiler les projets
 * un à un (fondu + dolly), avec bande de vignettes, grand index et métadonnées
 * en surimpression. Inertie via Lenis. Repli sobre si reduced-motion.
 */
export function ProjectsCinema({
  projects,
  categoryName,
  emptyLabel = "Aucun projet publié pour le moment.",
  transitionEnabled = true,
  transitionSpeed = 1,
}: {
  projects: P[];
  categoryName: string;
  emptyLabel?: string;
  transitionEnabled?: boolean;
  transitionSpeed?: number;
}) {
  const n = projects.length;
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const router = useRouter();
  const busy = useRef(false);
  // Ouverture d'un projet : transition partagée (couverture = élément partagé),
  // miroir exact du changement de page, navbar figée.
  const onCover = (e: React.MouseEvent, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // Réglage back-office : ouverture désactivée → navigation directe.
    if (!transitionEnabled) {
      router.push(`/projects/${slug}`);
      return;
    }
    if (busy.current) return;
    // La page Projets doit être ENTIÈREMENT affichée (animation d'entrée terminée) avant
    // de pouvoir ouvrir un projet : sinon `<main>` est encore scalé par le rezoom de
    // page → la couverture est mesurée à une taille/position fausse → elle déborde du
    // cadre (« des fois »). On ignore le clic tant que la page n'est pas posée.
    const main = document.querySelector<HTMLElement>("main");
    const entering =
      pageZoom.value < 0.999 ||
      (!!main && !!main.style.transform && main.style.transform !== "none");
    if (entering) return;
    const img = (e.currentTarget as HTMLElement).querySelector("img");
    if (!img) {
      router.push(`/projects/${slug}`);
      return;
    }
    busy.current = true;
    openProject(
      img as HTMLImageElement,
      slug,
      () => router.push(`/projects/${slug}`),
      transitionSpeed,
    );
  };

  // RETOUR depuis un projet : on recentre INSTANTANÉMENT le cinéma sur le projet
  // d'où l'on revient → sa couverture est au centre quand le clone partagé atterrit.
  useIsoLayoutEffect(() => {
    if (reduced || n === 0) return;
    const slug = consumeReturnSlug();
    if (!slug) return;
    const i = projects.findIndex((p) => p.slug === slug);
    if (i < 0) return;
    const wrap = wrapRef.current;
    if (!wrap) {
      setActive(i);
      return;
    }
    const total = wrap.offsetHeight - window.innerHeight;
    const target = wrap.offsetTop + (n > 1 ? (i / (n - 1)) * total : 0);
    window.scrollTo(0, Math.max(0, target));
    setActive(i);
  }, []);

  useEffect(() => {
    if (reduced || n === 0) return;
    const STEP = 66; // hauteur vignette + écart (doit suivre les classes ci-dessous)
    const lenis = new Lenis({ lerp: 0.08 });
    lenisRef.current = lenis;
    let raf = 0;
    let last = -1;

    const loop = (t: number) => {
      lenis.raf(t);
      const wrap = wrapRef.current;
      if (wrap) {
        const vh = window.innerHeight;
        const total = wrap.offsetHeight - vh; // course réelle en px
        const rectTop = wrap.getBoundingClientRect().top;
        const traveled = Math.min(Math.max(-rectTop, 0), total);
        const af = total > 0 ? (traveled / total) * (n - 1) : 0; // index flottant 0..n-1

        const layers = layerRefs.current;
        for (let i = 0; i < layers.length; i++) {
          const el = layers[i];
          if (!el) continue;
          const d = af - i; // 0 = actif, <0 à venir, >0 passé
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

    // Snap doux : à l'arrêt du scroll, on cale sur la vue la plus proche
    // pour toujours reposer sur une image nette (jamais entre deux).
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
      if (Math.abs(af - target) < 0.012) return; // déjà aligné
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

  if (n === 0) {
    return (
      <>
        <FrameMeta title={categoryName} />
        <p className="py-20 text-center text-neutral-500">{emptyLabel}</p>
      </>
    );
  }

  // ---- Repli accessible (pas d'animation) ----
  if (reduced) {
    return (
      <div className="space-y-16 pb-24">
        <FrameMeta title={categoryName} count={n} unit="Projets" />
        {projects.map((p, i) => {
          const cover = p.photos[0];
          return (
            <Link key={p.id} href={`/projects/${p.slug}`} className="group block">
              {cover && (
                <ResponsiveImage
                  variants={cover.variants}
                  alt={cover.altText}
                  width={cover.width}
                  height={cover.height}
                  lqip={cover.lqip}
                  sizes="100vw"
                  priority={i === 0}
                  className="h-auto w-full"
                />
              )}
              <div className="mt-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-neutral-500">
                <span className="text-neutral-800">{p.title}</span>
                <span>
                  {pad(i + 1)} / {pad(n)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  const current = projects[active] ?? projects[0];
  const y = year(current.shotDate);

  return (
    // Hauteur = n écrans → marge de défilement ; la scène est "sticky".
    <div ref={wrapRef} style={{ height: `${n * 100}vh` }} className="relative">
      {/* Atterrissage du clone partagé quand on revient d'un projet (rebond spring) */}
      <ProjectTransitionMount />
      {/* Compteur "01 / 06" du projet actif dans le cadre global */}
      <FrameMeta title={categoryName} count={n} current={active + 1} />
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Couches d'images empilées (fondu + dolly) */}
        <div className="absolute inset-0">
          {projects.map((p, i) => {
            const cover = p.photos[0];
            return (
              <div
                key={p.id}
                ref={(el) => {
                  layerRefs.current[i] = el;
                }}
                className="absolute inset-0 flex items-center justify-center will-change-[opacity,transform]"
                style={{ opacity: i === 0 ? 1 : 0 }}
              >
                <Link
                  href={`/projects/${p.slug}`}
                  aria-label={`Ouvrir le projet ${p.title}`}
                  onClick={(e) => onCover(e, p.slug)}
                  {...(i === active ? { "data-cinema-cover": "" } : {})}
                  className="group relative block h-[64vh] w-[78vw] max-w-[1080px] [&>picture]:block [&>picture]:h-full [&>picture]:w-full"
                >
                  {cover && (
                    <ResponsiveImage
                      variants={cover.variants}
                      alt={cover.altText}
                      width={cover.width}
                      height={cover.height}
                      sizes="80vw"
                      priority={i === 0}
                      className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                    />
                  )}
                  {/* indice discret au survol (pas de bouton) */}
                  <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Voir le projet →
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Les repères d'angle + le compteur sont fournis par le cadre global. */}

        {/* Bande de vignettes (gauche) — décalée à droite pour ne pas chevaucher
            la colonne d'icônes réseaux sociaux du cadre (gauche-milieu). */}
        <div className="pointer-events-none absolute left-0 top-0 hidden h-screen w-40 overflow-hidden md:block">
          <div ref={stripRef} className="absolute left-16 will-change-transform">
            {projects.map((p, i) => {
              const cover = p.photos[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Aller au projet ${p.title}`}
                  className={`pointer-events-auto mb-[10px] block h-14 w-20 overflow-hidden border transition-all duration-300 ${
                    i === active
                      ? "border-neutral-900 opacity-100"
                      : "border-transparent opacity-35 hover:opacity-70"
                  }`}
                >
                  {cover && (
                    <ResponsiveImage
                      variants={cover.variants}
                      alt={cover.altText}
                      width={cover.width}
                      height={cover.height}
                      sizes="80px"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Métadonnées (droite) */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-6 text-right md:flex md:right-8">
          <div className="font-mono text-6xl font-light leading-none tabular-nums text-neutral-900">
            {pad(active + 1)}
          </div>
          <Meta label="Projet">{current.title}</Meta>
          {current.location && <Meta label="Lieu">{current.location}</Meta>}
          {y && <Meta label="Année">{y}</Meta>}
        </div>

        {/* Titre (mobile uniquement — sur desktop le HUD de droite l'affiche) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-5 py-6 md:hidden">
          <div className="font-mono text-sm uppercase tracking-[0.2em] text-neutral-800">
            {current.title}
            {current.location ? ` — ${current.location}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs uppercase tracking-[0.15em] text-neutral-800">
        {children}
      </div>
    </div>
  );
}

