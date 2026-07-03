"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
import { HudInner } from "@/components/public/site-frame";
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
  // Ouverture en cours → on masque le HUD DU CINÉMA : c'est le calque persistant du cadre
  // (z-90) qui prend le relais et se décode (Matrix), pour n'avoir qu'UN seul HUD.
  const [opening, setOpening] = useState(false);
  // Retour depuis un projet : le HUD du projet est porté par le calque persistant du cadre
  // (qui se décode). On garde le HUD PROPRE du cinéma masqué jusqu'à ce que ce calque rende
  // la main (`ac:hud-release`) → un seul HUD, pas de doublon à l'atterrissage.
  const [returning, setReturning] = useState(false);
  const reduced = usePrefersReducedMotion();
  // TACTILE (pointer: coarse) : mécanique de scroll adaptée — course RÉDUITE par projet
  // (une pichenette = un projet, au lieu de 100vh à balayer) et snap NATIF (CSS
  // scroll-snap, cf. `ac-snap-y`) : le momentum iOS n'est plus combattu par le snap JS.
  const touch = useIsTouch();
  // Course de scroll par projet (vh) : 100 sur desktop (inchangé), 60 au tactile.
  const stepVh = touch ? 60 : 100;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const mStripRef = useRef<HTMLDivElement | null>(null); // bande horizontale (mobile)
  const lenisRef = useRef<Lenis | null>(null);

  const router = useRouter();
  const busy = useRef(false);
  // Ouverture d'un projet : transition partagée (couverture = élément partagé),
  // miroir exact du changement de page, navbar figée.
  const onCover = (e: React.MouseEvent, proj: P, idx: number) => {
    const slug = proj.slug;
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
    setOpening(true); // masque le HUD du cinéma → le calque persistant du cadre prend le relais
    openProject(
      img as HTMLImageElement,
      slug,
      () => router.push(`/projects/${slug}`),
      transitionSpeed,
      // Infos du projet destination → le HUD persiste pendant l'ouverture (comme
      // projet → projet), affiché par le calque persistant du cadre (z-90).
      {
        title: proj.title,
        location: proj.location,
        year: year(proj.shotDate),
        index: idx + 1,
        total: n,
      },
    );
  };

  // RETOUR depuis un projet : on recentre INSTANTANÉMENT le cinéma sur le projet
  // d'où l'on revient → sa couverture est au centre quand le clone partagé atterrit.
  useIsoLayoutEffect(() => {
    if (reduced || n === 0) return;
    const slug = consumeReturnSlug();
    // HUD masqué jusqu'à `ac:hud-release` si une transition HUD arrive DANS ce cinéma :
    // retour d'un projet (slug) OU navigation cinéma → cinéma (`data-hud-persist` déjà posé
    // par le cadre côté page source). Le calque persistant porte le HUD en attendant.
    const incoming = document.documentElement.hasAttribute("data-hud-persist");
    if (slug || incoming) setReturning(true);
    if (!slug) return;
    const i = projects.findIndex((p) => p.slug === slug);
    if (i < 0) return;
    const wrap = wrapRef.current;
    if (!wrap) {
      setActive(i);
      return;
    }
    // Course calculée depuis le PAS (et non wrap.offsetHeight) : au montage, la hauteur
    // DOM correspond encore à touch=false (le re-rendu tactile est flushé juste après,
    // avant le paint) → on vise directement la géométrie FINALE.
    const step = window.matchMedia("(pointer: coarse)").matches ? 60 : 100;
    const total = ((n - 1) * step * window.innerHeight) / 100;
    const target = wrap.offsetTop + (n > 1 ? (i / (n - 1)) * total : 0);
    window.scrollTo(0, Math.max(0, target));
    setActive(i);
  }, []);

  // Le calque persistant du cadre a fini de rendre la main → on ré-affiche le HUD du cinéma
  // EXACTEMENT à cet instant (il disparaît en même temps) : jamais deux HUD à l'écran.
  // Filet de sécurité : si l'event n'arrive pas, on ré-affiche quand même après un délai.
  useEffect(() => {
    if (!returning) return;
    const reveal = () => setReturning(false);
    window.addEventListener("ac:hud-release", reveal);
    const safety = window.setTimeout(reveal, 3500);
    return () => {
      window.removeEventListener("ac:hud-release", reveal);
      window.clearTimeout(safety);
    };
  }, [returning]);

  // Diffuse le projet ACTIF au cadre → il peut porter ces infos sur son calque persistant
  // (z-90) pendant une transition cinéma → cinéma, exactement comme entre deux pages projet.
  useEffect(() => {
    if (n === 0) return;
    const p = projects[active] ?? projects[0];
    window.dispatchEvent(
      new CustomEvent("ac:cinema-hud", {
        detail: {
          title: p.title,
          location: p.location,
          year: year(p.shotDate),
          index: active + 1,
          total: n,
        },
      }),
    );
  }, [active, n, projects]);

  // En QUITTANT le cinéma (toute transition de page), on masque son HUD : le calque
  // persistant du cadre prend le relais (Matrix) sans doublon. `opening` sert aussi à
  // l'ouverture d'un projet — même effet (masquage).
  useEffect(() => {
    const onExit = () => setOpening(true);
    window.addEventListener("ac:page-exit", onExit);
    return () => window.removeEventListener("ac:page-exit", onExit);
  }, []);

  // Au démontage du cinéma, on efface sa diffusion → une future navigation depuis une page
  // SANS HUD (galerie) ne réutilisera pas par erreur ce projet actif comme source.
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("ac:cinema-hud", { detail: null }));
    };
  }, []);

  useEffect(() => {
    if (reduced || n === 0) return;
    const STEP = 66; // hauteur vignette + écart (doit suivre les classes ci-dessous)
    // lerp élevé (avant 0.08) = inertie courte → le cinéma ne "glisse" plus entre deux
    // projets après le geste ; recalage quasi immédiat.
    const lenis = new Lenis({ lerp: 0.2 });
    lenisRef.current = lenis;
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
        const total = wrap.offsetHeight - vh; // course réelle en px
        const rectTop = wrap.getBoundingClientRect().top;
        const traveled = Math.min(Math.max(-rectTop, 0), total);
        const af = total > 0 ? (traveled / total) * (n - 1) : 0; // index flottant 0..n-1

        // PERF : à l'arrêt (af inchangé), on ne réécrit pas 4 styles × n couches à
        // chaque frame — la boucle ne fait plus que lire. Reprend dès que ça bouge.
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

        // Bande horizontale mobile : centre la vignette active sur l'écran (suit le scroll).
        // Pas = largeur RÉELLE d'une vignette + écart (mesuré → suit la taille responsive).
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
      // Recalage quasi instantané (avant : 0.6s → impression de flottement).
      lenis.scrollTo(window.scrollY + rectTop + desired, { duration: 0.14 });
    };
    const onScroll = () => {
      clearTimeout(idle);
      // Dès que le scroll ralentit (faible vélocité), on recale IMMÉDIATEMENT au lieu
      // d'attendre la fin de l'inertie → plus de temps mort "coincé" entre 2 projets.
      idle = setTimeout(snap, Math.abs(lenis.velocity) < 5 ? 0 : 40);
    };
    // Snap JS = DESKTOP uniquement (molette lissée par Lenis). Au tactile, c'est le
    // scroll-snap CSS natif qui recale (cf. `ac-snap-y`) — le snap JS se battrait
    // contre le momentum natif d'iOS (sensation de blocage).
    if (!touch) lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced, n, touch]);

  // TACTILE : active le snap natif du document (marqueurs [data-cinema-snap] ci-dessous)
  // et ALIGNE les marqueurs sur les paliers RÉELS en px : posés en vh, ils divergent de
  // `innerHeight` quand la barre d'outils de Safari iOS se replie → le snap se calait un
  // poil À CÔTÉ du palier (slide légèrement transparente/décalée). On mesure, et on suit
  // les resize (le repli de la barre iOS en déclenche un).
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
          m.style.top = `${n > 1 ? (k / (n - 1)) * total : 0}px`;
        });
    };
    place();
    window.addEventListener("resize", place);
    // ⚠️ Snap SUSPENDU pendant les transitions de page (pageZoom < 1) : le snap
    // `mandatory` calcule ses cibles sur les positions TRANSFORMÉES — quand la page est
    // scalée (dézoom), les marqueurs « rétrécissent » et le navigateur RE-SCROLLE le
    // document en plein zoom pour se recaler. La scène sticky suit ce scroll parasite →
    // la galerie sortait du petit cadre (affichée en haut). Actif au repos uniquement.
    let raf = 0;
    const tick = () => {
      const want = pageZoom.value >= 0.999;
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
    // Hauteur = 1 écran + (n-1) pas de défilement ; la scène est "sticky".
    // Desktop : pas de 100vh (identique à avant) ; tactile : pas réduit (cf. stepVh).
    <div
      ref={wrapRef}
      style={{ height: `calc(100vh + ${(n - 1) * stepVh}vh)` }}
      className="relative"
    >
      {/* Marqueurs de snap natif (tactile) : un par projet, aux positions exactes des
          paliers → le compositeur recale dessus, af retombe pile sur un entier. */}
      {touch &&
        Array.from({ length: n }, (_, k) => (
          <div
            key={k}
            aria-hidden
            data-cinema-snap
            className="absolute left-0 h-px w-px"
            style={{ top: `${k * stepVh}vh`, scrollSnapAlign: "start" }}
          />
        ))}
      {/* Atterrissage du clone partagé quand on revient d'un projet (rebond spring) */}
      <ProjectTransitionMount />
      {/* Compteur "01 / 06" du projet actif dans le cadre global */}
      <FrameMeta title={categoryName} count={n} current={active + 1} />
      {/* bg-white EXPLICITE : sert de fond au mix-blend-difference des métadonnées mobile.
          Sans lui, le fond blanc de la page est dans un autre contexte d'empilement → le
          texte blanc en mix-blend n'a rien à inverser hors de la photo (→ invisible). Avec,
          le texte devient noir sur le blanc et reste inversé sur la photo : lisible partout. */}
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
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
                  onClick={(e) => onCover(e, p, i)}
                  {...(i === active ? { "data-cinema-cover": "" } : {})}
                  className="group relative block h-[48vh] w-[54vw] max-w-[1080px] [&>picture]:block [&>picture]:h-full [&>picture]:w-full md:h-[64vh] md:w-[58vw] lg:w-[78vw]"
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

        {/* Métadonnées (droite) — MÊME composant + MÊMES classes que le HUD du cadre
            (pages projet) : le HUD garde un style unique sur tout le site. */}
        <div
          data-cinema-hud
          className={`pointer-events-none absolute right-5 top-1/2 z-[110] hidden -translate-y-1/2 select-none flex-col items-end gap-5 text-right font-mono font-bold uppercase text-white mix-blend-difference md:flex md:right-8 ${opening || returning ? "opacity-0" : ""}`}
        >
          <HudInner
            info={{
              title: current.title,
              location: current.location,
              year: y,
              index: active + 1,
              total: n,
            }}
          />
        </div>

        {/* Métadonnées MOBILE — même HUD partagé (HudInner), en mix-blend pour rester
            lisible par-dessus la photo (cf. bg-white du conteneur + z-[110]). */}
        <div
          data-cinema-hud
          className={`pointer-events-none absolute right-5 top-1/2 z-[110] flex max-w-[80vw] -translate-y-1/2 select-none flex-col items-end gap-5 text-right font-mono font-bold uppercase text-white mix-blend-difference md:hidden ${opening || returning ? "opacity-0" : ""}`}
        >
          <HudInner
            info={{
              title: current.title,
              location: current.location,
              year: y,
              index: active + 1,
              total: n,
            }}
          />
        </div>

        {/* Bande de vignettes de navigation (mobile) — en bas. DÉFILE avec le scroll pour
            centrer le projet actif (piste translatée par `mStripRef`, comme la bande
            verticale du desktop). Conteneur `overflow-hidden` : les vignettes hors écran
            sont masquées. `pointer-events-none` sur le rail, `auto` sur chaque vignette. */}
        {/* Position JUSTE SOUS la photo : la couverture fait 48vh centrée → son bas est à
            74vh du haut, donc on ancre la bande à 76vh (et 75vh sur écran haut où on la
            remonte un peu). h-16 = assez haut pour la plus grande vignette. */}
        <div className="pointer-events-none absolute inset-x-0 top-[76vh] z-[110] h-16 overflow-hidden md:hidden [@media(min-height:800px)]:top-[75vh]">
          <div
            ref={mStripRef}
            className="absolute left-0 top-0 flex gap-1.5 will-change-transform"
          >
            {projects.map((p, i) => {
              const cov = p.photos[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Aller au projet ${p.title}`}
                  className={`pointer-events-auto h-12 w-16 shrink-0 overflow-hidden border transition-all duration-300 [@media(min-height:800px)]:h-16 [@media(min-height:800px)]:w-24 ${
                    i === active
                      ? "border-neutral-900 opacity-100"
                      : "border-neutral-300 opacity-45"
                  }`}
                >
                  {cov && (
                    <ResponsiveImage
                      variants={cov.variants}
                      alt={cov.altText}
                      width={cov.width}
                      height={cov.height}
                      sizes="96px"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


