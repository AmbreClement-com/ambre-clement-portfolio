"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { pageZoom, pageOffset, projectReveal } from "@/lib/page-zoom";
import { cn } from "@/lib/utils";
import type { Photo } from "@/server/db/schema";

const Lightbox = dynamic(() => import("./lightbox").then((m) => m.Lightbox));

// Layout effect SSR-safe (sinon warning au rendu serveur).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

const VERT = `
precision mediump float;
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix0;
uniform float uVelocity;
uniform float uPhase;
uniform float uHalf;
uniform float uTime;
uniform float uMouseX;
uniform float uMouseY;
uniform float uHover;
uniform float uZoom;
uniform vec2 uOffset;
varying vec2 vTextureCoord;
void main() {
  vec3 pos = aVertexPosition;
  // Position verticale du sommet dans le viewport : 0 = haut, 1 = bas.
  float vy = uPhase + aVertexPosition.y * uHalf;
  // « Rouleau » fixe au milieu de l'écran (pleine largeur, droit) : une bosse
  // gaussienne centrée sur 0.5. En scrollant, chaque image se drape dessus →
  // la vague balaie l'image quand elle traverse le centre.
  float d = vy - 0.5;
  float roll = exp(-d * d * 16.0);
  // léger creux juste avant/après la crête → drapé de rideau (jolie vague)
  float drape = -d * exp(-d * d * 9.0) * 1.6;
  pos.z += (roll + drape) * uVelocity;
  // Survol « flottement » (× uHover) : la SURFACE SUIT LA SOURIS — une bosse
  // douce se soulève sous le curseur + légère inclinaison globale vers lui.
  // Respire un peu (uTime). Exclusif avec l'estompage (réglage back-office).
  vec2 m = vec2(uMouseX, uMouseY);
  float dm = distance(aVertexPosition.xy, m);
  float bulge = exp(-dm * dm * 1.1) * (1.0 + sin(uTime) * 0.12);
  float tilt = aVertexPosition.x * uMouseX + aVertexPosition.y * uMouseY;
  // + flottement continu des bords (la photo flotte EN PLUS de suivre la souris)
  float fl = sin(aVertexPosition.x * 2.4 + uTime)
           + sin(aVertexPosition.y * 2.1 + uTime * 1.2);
  float edge = max(abs(aVertexPosition.x), abs(aVertexPosition.y));
  pos.z += (bulge * 0.022 + tilt * 0.007 + fl * (0.3 + 0.7 * edge) * 0.0045) * uHover;
  gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
  // Zoom de page (transition) : scale centré écran PUIS pan (uOffset, clip space).
  // uOffset=[0,0] → centré (transition de page inchangée) ; ≠0 → galerie recadrée
  // (ouverture projet : 1re photo amenée au centre du petit cadre).
  gl_Position.xy = gl_Position.xy * uZoom + uOffset;
  vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uSampler0;
uniform float uAlpha;
varying vec2 vTextureCoord;
// × uAlpha sur TOUT le vecteur (rgb + a) : le contexte est en premultipliedAlpha,
// c'est la façon correcte d'estomper sans liseré sur les bords.
void main() { gl_FragColor = texture2D(uSampler0, vTextureCoord) * uAlpha; }`;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Nombre d'images d'une période de boucle « propre » : un multiple de `perRow`
 * (rangées entières → pas de décalage de colonnes) ET un multiple du nombre de
 * photos (mêmes images → boucle invisible). = PPCM(n, perRow) en nb d'images.
 */
function periodCount(n: number, perRow: number): number {
  if (n === 0) return 0;
  return n * (perRow / gcd(n, perRow));
}

export function PhotosScroller({
  photos,
  emptyLabel = "Cette galerie sera bientôt en ligne.",
  hoverEnabled = false,
  hoverIntensity = 100,
  dimEnabled = true,
  dimIntensity = 100,
  scrollEnabled = true,
  scrollIntensity = 100,
  infiniteEnabled = true,
}: {
  photos: Photo[];
  emptyLabel?: string;
  /** Survol « flottement » (déformation qui suit la souris). Exclusif avec dim. */
  hoverEnabled?: boolean;
  hoverIntensity?: number;
  /** Survol « mise en avant » (les autres photos s'estompent). Exclusif avec hover. */
  dimEnabled?: boolean;
  dimIntensity?: number;
  scrollEnabled?: boolean;
  scrollIntensity?: number;
  infiniteEnabled?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  // Photo survolée (fallback DOM sans WebGL) — en WebGL c'est hoverRef qui pilote.
  const [hovered, setHovered] = useState<number | null>(null);
  // Colonnes MAX selon la largeur (4 desktop / 2 mobile). Défaut 4 = sûr en SSR.
  const [maxCols, setMaxCols] = useState(4);
  const [webglOn, setWebglOn] = useState(false);
  // WebGL réservé au desktop (≥1024). Sur mobile/tablette, chaque photo devient une
  // texture GPU NON compressée (≈34 Mo pour une 2400px) et curtains ignore le srcset →
  // il charge la plus grande variante. Avec 2 périodes de boucle, la mémoire GPU sature
  // et Safari mobile crashe. On y sert donc les <picture> responsives natifs (petites
  // variantes choisies par le srcset + lazy-load natif), sans aucune texture GPU.
  const [webglEnabled, setWebglEnabled] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Petite galerie (≤ 8 photos) : pas de scroll infini (trop peu d'images pour une
  // boucle crédible) → affichage statique « intelligent », centré dans le viewport
  // (cf. perRow + le conteneur centré au rendu).
  const smallGallery = photos.length <= 8;
  // Le scroll infini repose sur curtains + Lenis (boucle onRender) → uniquement quand le
  // WebGL est actif (desktop). Sur mobile/tablette : scroll natif fini, photos une seule fois.
  const infiniteActive = infiniteEnabled && !smallGallery && webglEnabled;
  // Colonnes effectives = min(nb photos, colonnes max). DÉRIVÉ AU RENDU (et non un state
  // posé par un effet) → correct dès le 1er rendu. Crucial : `finishReveal` (ouverture
  // projet) mesure la 1re photo en `useLayoutEffect` ; avec un perRow tardif elle mesurait
  // une grille à 4 colonnes (photo à gauche) au lieu de la vraie position (centrée).
  const perRow = Math.max(1, Math.min(photos.length, maxCols));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const hoverRef = useRef<number | null>(null); // index du plan survolé
  const mouseRef = useRef({ x: 0, y: 0 }); // souris dans la photo survolée (-1..1)

  // Survol « mise en avant » : la photo survolée reste pleine, TOUTES les
  // autres s'estompent. L'intensité règle la force de l'estompage :
  // 100 % → les autres descendent à 0.45 d'opacité (référence), 0 % → aucun effet.
  const dimAlpha = dimEnabled
    ? Math.max(0.05, 1 - 0.55 * (dimIntensity / 100))
    : 1;

  // Colonnes : 4 desktop (≥1024) · 3 tablette (768-1023, cellules plus larges → photos
  // plus grandes) · 2 portrait large (480-767) · 1 téléphone (<480, photos en grand),
  // MAIS plafonné au nombre de photos → petite galerie centrée et « intelligente ».
  // `justify-items-center` (cf. la grille) centre chaque photo.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const tablet = window.matchMedia("(min-width: 768px)");
    const phone = window.matchMedia("(max-width: 479px)");
    const apply = () => {
      setMaxCols(wide.matches ? 4 : tablet.matches ? 3 : phone.matches ? 1 : 2);
      // WebGL desktop uniquement (cf. `webglEnabled`) : évite la saturation mémoire GPU.
      setWebglEnabled(wide.matches);
    };
    apply();
    const mqs = [wide, tablet, phone];
    mqs.forEach((mq) => mq.addEventListener("change", apply));
    return () => mqs.forEach((mq) => mq.removeEventListener("change", apply));
  }, []);

  // La galerie démarre TOUJOURS en haut : on neutralise tout scroll résiduel de la
  // page précédente (le cinéma fait n×100vh) AVANT que Lenis ne lise la position à sa
  // création — sinon la boucle de scroll infini le replie au milieu/bas (« atterrit
  // en bas »). Au MONTAGE uniquement (pas sur un re-rendu / changement de colonnes).
  useIsoLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pendant un dézoom de page (`pageZoom < 1`) : clip du canvas au « 1er cadre » +
  // masquage de la grille d'images DOM. Sans ça, en arrivant d'une page NON-galerie,
  // la grille s'affiche pleine taille tant que curtains (import dynamique) charge.
  // ⚠️ `useLayoutEffect` + application SYNCHRONE = masqué AVANT le 1er paint (sinon
  // 1-2 frames de flash plein écran). Une boucle rAF entretient ensuite l'état.
  useIsoLayoutEffect(() => {
    const apply = () => {
      // Ouverture de projet en cours → c'est `finishReveal` qui pilote le clip du
      // canvas ; on n'y touche surtout pas (sinon on l'efface quand pageZoom ≈ 1, et
      // la page déborde du cadre). On garde juste la grille DOM masquée tant que le
      // WebGL n'a pas pris le relais (sinon elle peut clignoter plein écran).
      if (projectReveal.active) {
        const rt = rootRef.current;
        if (rt && rt.style.opacity !== "0") rt.style.opacity = "0";
        return;
      }
      const z = pageZoom.value;
      const dz = z < 0.999;
      const cv = canvasRef.current;
      if (cv) {
        if (dz) {
          const mx = (window.innerWidth * (1 - z)) / 2;
          const my = (window.innerHeight * (1 - z)) / 2;
          cv.style.clipPath = `inset(${my}px ${mx}px ${my}px ${mx}px)`;
        } else if (cv.style.clipPath) {
          cv.style.clipPath = "";
        }
      }
      const rt = rootRef.current;
      if (rt) {
        if (dz && rt.style.opacity !== "0") rt.style.opacity = "0";
        else if (!dz && rt.style.opacity === "0") rt.style.opacity = "";
      }
    };
    apply(); // synchrone, avant le 1er paint
    let raf = 0;
    const tick = () => {
      apply();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // WebGL (curtains.js) + scroll infini (boucle transparente)
  useEffect(() => {
    if (reduced || photos.length === 0 || !webglEnabled) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { Curtains, Plane } = await import("curtainsjs");
      if (cancelled || !canvasRef.current || !rootRef.current) return;

      const curtains = new Curtains({
        container: canvasRef.current,
        // résolution native (retina) → image nette, pas de sous-échantillonnage
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
        watchScroll: true,
        alpha: true,
        // MSAA activé → bords lisses quand l'image se déforme au survol
        antialias: true,
        // CRUCIAL : sans ça (défaut false), le MSAA mélange le bord avec l'effacement
        // noir transparent, puis le navigateur re-multiplie → liseré gris sur les bords
        // (surtout au survol/scroll). En premultiplied, le bord se compose correctement.
        premultipliedAlpha: true,
      });
      curtains.onError(() => {});

      const lenis = new Lenis({ lerp: 0.09, infinite: false });
      lenisRef.current = lenis;
      // Accès aux champs internes (privés dans les types, présents à l'exécution)
      // pour décaler le scroll en préservant l'élan lors de la boucle infinie.
      const li = lenis as unknown as {
        animatedScroll: number;
        targetScroll: number;
        animate: { value: number; to: number };
        setScroll: (n: number) => void;
      };
      let lastS = lenis.animatedScroll;
      let vel = 0;
      let mag = 0;

      const els = Array.from(
        rootRef.current.querySelectorAll<HTMLElement>("[data-plane]"),
      );
      const planes = els.map(
        (el) =>
          new Plane(curtains, el, {
            vertexShader: VERT,
            fragmentShader: FRAG,
            widthSegments: 12,
            heightSegments: 12,
            uniforms: {
              velocity: { name: "uVelocity", type: "1f", value: 0 },
              phase: { name: "uPhase", type: "1f", value: 0 },
              half: { name: "uHalf", type: "1f", value: 0.1 },
              time: { name: "uTime", type: "1f", value: 0 },
              // position de la souris dans la photo (-1..1), lissée → la bosse suit
              mouseX: { name: "uMouseX", type: "1f", value: 0 },
              mouseY: { name: "uMouseY", type: "1f", value: 0 },
              hover: { name: "uHover", type: "1f", value: 0 },
              // opacité de la photo (estompage des non-survolées)
              alpha: { name: "uAlpha", type: "1f", value: 1 },
              zoom: { name: "uZoom", type: "1f", value: 1 },
              offset: { name: "uOffset", type: "2f", value: [0, 0] },
            },
          }),
      );

      // Hauteur d'UNE période de boucle (rangées entières) = offset de l'image
      // qui démarre la 2ᵉ période. On boucle dessus → bascule invisible.
      const period = periodCount(photos.length, perRow);
      let setH = 0;
      const measure = () => {
        if (period > 0 && els.length > period) {
          setH = els[period].offsetTop - els[0].offsetTop;
        }
      };
      measure();
      window.addEventListener("resize", measure);

      if (!cancelled) setWebglOn(true);

      // Réglages back-office : intensité (0..2) et activation par effet.
      const hoverMax = hoverEnabled ? hoverIntensity / 100 : 0;
      const scrollMul = scrollEnabled ? scrollIntensity / 100 : 0;

      let time = 0;
      let smx = 0;
      let smy = 0;
      curtains.onRender(() => {
        const vh = window.innerHeight || 1;
        time += 0.016; // léger « souffle »
        // lissage de la souris → la bosse traîne et flotte vers le curseur
        smx += (mouseRef.current.x - smx) * 0.08;
        smy += (mouseRef.current.y - smy) * 0.08;
        const sc = lenis.animatedScroll;
        const inst = sc - lastS;
        lastS = sc;
        vel += (inst - vel) * 0.11;
        mag += (Math.abs(vel) - mag) * 0.035;
        const amp = scrollMul * Math.min(mag, 6) * 0.0034;

        // Boucle infinie : quand on dépasse une période, on décale TOUTES les
        // valeurs internes de Lenis de -setH. L'écart target↔animated (= la
        // vélocité/élan) est préservé → aucun à-coup au raccord.
        if (infiniteActive && setH > 0 && sc > setH) {
          li.animatedScroll -= setH;
          li.targetScroll -= setH;
          li.animate.value -= setH;
          li.animate.to -= setH;
          li.setScroll(li.animatedScroll);
          lastS -= setH;
        }

        planes.forEach((p, i) => {
          const b = p.getBoundingRect();
          const cy = (b.top + b.height / 2) / vh;
          p.uniforms.velocity.value = amp;
          p.uniforms.phase.value = cy;
          p.uniforms.half.value = b.height / 2 / vh;
          p.uniforms.time.value = time;
          p.uniforms.mouseX.value = smx;
          p.uniforms.mouseY.value = smy;
          // dézoom de page piloté par le cadre (transition) — lu en continu
          p.uniforms.zoom.value = pageZoom.value;
          // pan du zoom (ouverture projet : 1re photo recadrée au centre)
          p.uniforms.offset.value = pageOffset.value;
          // Flottement : déformation seulement au survol (× intensité), lerp doux.
          const hTarget = hoverRef.current === i ? hoverMax : 0;
          p.uniforms.hover.value += (hTarget - p.uniforms.hover.value) * 0.09;
          // Mise en avant : la photo survolée reste à 1, TOUTES les autres
          // s'estompent vers `dimAlpha`. Lerp doux ≈ le fondu 0,4 s de la référence.
          const target =
            hoverRef.current === null || hoverRef.current === i ? 1 : dimAlpha;
          const a = p.uniforms.alpha.value as number;
          p.uniforms.alpha.value = a + (target - a) * 0.1;
        });
      });

      let raf = 0;
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", measure);
        lenis.destroy();
        lenisRef.current = null;
        planes.forEach((p) => p.remove());
        curtains.dispose();
        setWebglOn(false);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    reduced,
    photos.length,
    perRow,
    hoverEnabled,
    hoverIntensity,
    dimAlpha,
    scrollEnabled,
    scrollIntensity,
    infiniteActive,
    webglEnabled,
  ]);

  useEffect(() => {
    const l = lenisRef.current;
    if (!l) return;
    if (index !== null) l.stop();
    else l.start();
  }, [index]);

  // Masque la barre de défilement tant que la galerie infinie est active
  useEffect(() => {
    if (!webglOn || !infiniteActive) return;
    const el = document.documentElement;
    el.classList.add("ac-hide-scrollbar");
    return () => el.classList.remove("ac-hide-scrollbar");
  }, [webglOn, infiniteActive]);

  if (photos.length === 0) {
    return <p className="py-20 text-center text-neutral-500">{emptyLabel}</p>;
  }

  // 2 périodes de boucle (rangées entières) → boucle infinie transparente,
  // sans décalage de colonnes au raccord.
  const period = periodCount(photos.length, perRow);
  const copies =
    infiniteActive && period > 0 ? (2 * period) / photos.length : 1;
  const looped = Array.from({ length: copies }, () => photos).flat();

  return (
    <>
      <div
        ref={canvasRef}
        aria-hidden
        data-page-clip
        className="pointer-events-none fixed inset-0 z-0"
      />

      <div
        ref={rootRef}
        className={webglOn ? "[&_button]:bg-transparent [&_picture]:opacity-0" : ""}
      >
        <div
          className={cn(
            smallGallery &&
              "flex min-h-[calc(100vh-12rem)] flex-col justify-center",
          )}
        >
          <div
            className="grid w-full justify-items-center gap-x-6 gap-y-8 min-[480px]:gap-y-16 lg:gap-x-10 lg:gap-y-28"
            style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
          >
            {looped.map((photo, i) => {
            const real = i % photos.length;
            return (
              <button
                key={`${photo.id}-${Math.floor(i / photos.length)}`}
                type="button"
                data-plane
                onClick={() => setIndex(real)}
                onMouseEnter={() => {
                  hoverRef.current = i;
                  // le state ne sert qu'au fallback DOM (desktop sans WebGL) —
                  // en WebGL on évite le re-rendu à chaque survol
                  if (!webglOn) setHovered(i);
                }}
                onMouseLeave={() => {
                  if (hoverRef.current === i) hoverRef.current = null;
                  setHovered((h) => (h === i ? null : h));
                }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  mouseRef.current = {
                    x: ((e.clientX - r.left) / r.width) * 2 - 1,
                    y: -(((e.clientY - r.top) / r.height) * 2 - 1),
                  };
                }}
                aria-label={`Agrandir : ${photo.altText}`}
                className={cn(
                  // Mobile ET tablette : largeur de colonne pleine + hauteur AUTO → le FORMAT
                  // des photos est préservé (aucun recadrage). Desktop (lg, ≥1024) : grille à
                  // hauteur fixe 255px. Identique pour toutes les galeries (photo ET projet).
                  "block w-full max-w-full cursor-pointer overflow-hidden [&>picture]:block lg:h-[255px] lg:w-auto lg:[&>picture]:h-full",
                  "transition-opacity duration-[400ms] ease-in-out",
                )}
                // Fallback DOM (desktop sans WebGL) : mêmes règles que les plans GL.
                style={{
                  opacity:
                    !webglOn &&
                    webglEnabled &&
                    hovered !== null &&
                    hovered !== i
                      ? dimAlpha
                      : undefined,
                }}
              >
                <ResponsiveImage
                  variants={photo.variants}
                  alt={photo.altText}
                  width={photo.width}
                  height={photo.height}
                  lqip={photo.lqip}
                  priority={i < perRow}
                  sizes="(max-width: 479px) 100vw, (max-width: 767px) 45vw, (max-width: 1023px) 32vw, 22vw"
                  className="h-auto w-full lg:h-full lg:w-auto"
                />
              </button>
            );
            })}
          </div>
        </div>
      </div>

      {index !== null && (
        <Lightbox photos={photos} index={index} setIndex={setIndex} />
      )}
    </>
  );
}
