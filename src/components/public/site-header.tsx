"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { MIN_ZOOM } from "@/lib/page-zoom";
import { markReturn } from "@/components/public/project-transition";
import { useFrameMeta } from "@/components/public/frame-context";

type NavCategory = { name: string; slug: string; type?: string };

const pad = (n: number) => String(n).padStart(2, "0");
const RADIUS = 28; // = rounded-[1.75rem]

// Le « cache » opaque de la pilule (calque plein dont on anime l'opacité 0→1→0)
// est géré dans run()/reveal() via coverRef → 100 % opaque garanti au palier.

// --- Décryptage (scramble) du titre -----------------------------------------
const LOGO = "Ambre Clément".toUpperCase();
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*<>?/+=-§¤";
const rnd = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
/**
 * Morphe `from` → `to` en Matrix : la LONGUEUR affichée interpole de l'un à l'autre
 * (écriture/effacement manuscrit des caractères en trop/manquants, sur les ~70 %
 * premiers) ET le texte se fige L→R dans les ~25 % finaux. Si `from`/`to` n'ont pas
 * le même nombre de caractères, on ajoute/retire donc les caractères en douceur.
 */
function renderScramble(el: HTMLElement, from: string, to: string, p: number) {
  const lenFrom = from.length;
  const lenTo = to.length;
  const curLen = Math.round(lenFrom + (lenTo - lenFrom) * Math.min(1, p / 0.7));
  let out = "";
  for (let i = 0; i < curLen; i++) {
    const ch = i < lenTo ? to[i] : undefined; // au-delà de `to` = caractère en trop
    if (ch === " ") {
      out += " ";
      continue;
    }
    const frac = lenTo > 1 ? i / (lenTo - 1) : 0;
    out += ch !== undefined && p >= 0.75 + 0.22 * frac ? ch : rnd();
  }
  el.textContent = out;
}

/**
 * Taille de police qui fait TENIR `text` ENTIER dans `maxWidth`, plafonnée à `cap`.
 * Le titre est en police MONOSPACE (font-mono) + interlettrage tracking-[0.18em] →
 * chaque caractère avance d'~0.8em. On en déduit la taille max sans dépendre d'une
 * mesure DOM (le conteneur flex centré fausse `scrollWidth`).
 */
const CHAR_ADVANCE_EM = 0.8; // mono (~0.6em) + tracking 0.18em + petite marge
function fitFontSize(text: string, maxWidth: number, cap: number): number {
  const chars = Math.max(1, text.length);
  const fit = maxWidth / (chars * CHAR_ADVANCE_EM);
  return Math.max(1, Math.min(cap, Math.floor(fit)));
}

/**
 * Navbar « flottante » qui EST sa propre transition de page (un seul composant,
 * aucun panneau/loader séparé). Au clic sur un lien interne :
 *  1) « AMBRE CLÉMENT » glisse au centre, les points/menu se replient ;
 *  2) la pilule ELLE-MÊME passe en `position:fixed` et se déplie (LARGEUR puis
 *     HAUTEUR) jusqu'au plein écran — un voile sombre interne la rend opaque, le
 *     NOM de destination s'y décrypte (Matrix) en grandissant — puis on navigue ;
 *  3) à l'arrivée elle se replie exactement à sa forme de barre et « AMBRE
 *     CLÉMENT » revient à gauche. Tout se passe sur le MÊME élément → zéro coupure.
 *
 * Le `<header>` est volontairement SANS transform (inset-0 + flex) : un transform
 * d'ancêtre piégerait la pilule `position:fixed` (containing-block) et l'empêcherait
 * de couvrir le viewport.
 */
export function SiteHeader({
  categories,
  pricingNav = null,
  transitionsEnabled,
  speed,
}: {
  categories: NavCategory[];
  pricingNav?: { href: string; label: string } | null;
  transitionsEnabled: boolean;
  speed: number;
}) {
  const router = useRouter();
  const ctx = useFrameMeta(); // meta de la page courante (dont `activeHref` éventuel)
  // facteur de vitesse (timeScale GSAP) accessible dans run/reveal (callbacks).
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Ouverture au SURVOL réservée aux appareils qui survolent réellement (souris). Sur
  // tactile, `mouseenter` se déclenche au tap AVANT le `click` → le menu s'ouvrirait puis
  // se refermerait aussitôt (double bascule). On désactive donc le survol sans vrai hover.
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const apply = () => setCanHover(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Verre TOUJOURS clair (blanc) → identique à la barre admin, sur toutes les pages quel
  // que soit leur ton. Contenu foncé, bien lisible sur le blanc.
  const dark = false;

  // Ferme le menu au changement de page (motif render-time, pas d'effet).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setOpen(false);
  }

  const items = [
    ...categories.map((c, i) => ({
      href: i === 0 ? "/" : `/${c.slug}`,
      label: c.name,
      cinema: c.type === "projects", // cible = cinéma projets → HUD persistant (Matrix)
    })),
    ...(pricingNav ? [{ ...pricingNav, cinema: false }] : []), // « Tarifs » si publiée
    { href: "/contact", label: "Contact", cinema: false },
  ];

  // Surbrillance forcée fournie par la page (ex. page projet → sa catégorie parente).
  const activeHref = ctx?.meta?.activeHref ?? null;
  const isActive = (href: string) => {
    const base =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(href + "/");
    return base || (activeHref != null && href === activeHref);
  };

  // ---- Transition de page (la pilule se transforme) -------------------------
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null); // cache opaque (masque le swap)
  const barRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const dotsRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const routesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {
      "/contact": "Contact",
      "/mentions-legales": "Mentions",
    };
    categories.forEach((c, i) => {
      map[i === 0 ? "/" : `/${c.slug}`] = c.name;
    });
    if (pricingNav) map[pricingNav.href] = pricingNav.label;
    routesRef.current = map;
  }, [categories, pricingNav]);
  const labelFor = (p: string) => {
    if (routesRef.current[p]) return routesRef.current[p];
    const seg = p.split("/").filter(Boolean).pop() ?? "";
    return seg ? seg.replace(/-/g, " ") : "Ambre Clément";
  };

  const animating = useRef(false);
  const awaiting = useRef(false);
  const first = useRef(true);
  const safety = useRef<number | null>(null);
  const titleText = useRef("");
  const rest = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const centerDx = useRef(0); // décalage logo→centre (le titre scramblé glisse)
  const pathRef = useRef(pathname);

  // Titre caché au montage.
  useEffect(() => {
    if (titleRef.current) gsap.set(titleRef.current, { autoAlpha: 0 });
  }, []);

  // ENTRÉE : la pilule se replie en barre, le texte se re-brouille brièvement,
  // « AMBRE CLÉMENT » revient à gauche. Tout sur le MÊME élément.
  const reveal = useCallback(() => {
    if (!awaiting.current) return;
    awaiting.current = false;
    // On signale tout de suite au cadre de page : il fige l'état dézoomé (clippe
    // la nouvelle galerie sans déborder), MAINTIENT pendant que la navbar se replie,
    // puis REZOOME (la page ressort du cadre après l'anim navbar — voir son délai).
    window.dispatchEvent(new Event("ac:page-enter"));
    if (safety.current) window.clearTimeout(safety.current);
    const pill = pillRef.current;
    const title = titleRef.current;
    const bar = barRef.current;
    const menu = menuRef.current;
    const cover = coverRef.current;
    if (!pill) return;
    const r = rest.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const z = MIN_ZOOM;
    // mini-barre dézoomée (état d'où l'on replie, miroir de l'aller)
    const dzLeft = vw / 2 + (r.left - vw / 2) * z;
    const dzTop = vh / 2 + (r.top - vh / 2) * z;
    const dzW = r.width * z;
    const dzH = r.height * z;
    // AU RETOUR : le titre part du NOM DE PAGE (affiché à la sortie) et MORPHE vers
    // le LOGO « AMBRE CLÉMENT » — longueurs différentes → on écrit/efface les
    // caractères en trop pendant le Matrix.
    const from = titleText.current;
    const prog = { p: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        // rend la main à React/Tailwind : la pilule reprend sa place + son verre
        pill.classList.remove("glass-paused"); // ré-active le backdrop-blur (verre)
        gsap.set(pill, {
          clearProps:
            "position,left,top,width,height,maxWidth,margin,zIndex,borderRadius,transition",
        });
        if (coverRef.current) gsap.set(coverRef.current, { opacity: 0 });
        if (title) {
          gsap.set(title, { autoAlpha: 0, x: 0, fontSize: "" });
          title.textContent = "";
        }
        if (bar) gsap.set(bar, { autoAlpha: 1 });
        if (menu)
          gsap.set(menu, {
            autoAlpha: 1,
            clearProps: "gridTemplateRows,transition",
          });
        animating.current = false;
      },
    });
    tl.timeScale(speedRef.current); // vitesse globale (réglage back-office)
    // INVERSE DE L'ALLER. 1) on REPLIE du 1er cadre → mini-barre (pendant que le
    //    cadre MAINTIENT l'état dézoomé), 2) PUIS la mini-barre se REZOOME jusqu'à
    //    la vraie barre (synchro avec le rezoom de la page).
    // RECONSTRUCTION de la navbar en UN SEUL mouvement continu (1er cadre → barre) :
    // 1) la pilule quitte le cadre en ACCÉLÉRANT (`power2.in` → finit vite) ...
    tl.to(
      pill,
      { left: dzLeft, top: dzTop, width: dzW, height: dzH, borderRadius: RADIUS, duration: 0.78, ease: "power2.in" },
      0,
    );
    // 2) ... et enchaîne SANS cassure (même vitesse au raccord) vers la barre en
    //    DÉCÉLÉRANT (`power3.out`) → atterrissage doux, synchro avec le rezoom page.
    tl.to(
      pill,
      { left: r.left, top: r.top, width: r.width, height: r.height, duration: 1.5, ease: "power3.out" },
      0.78,
    );
    // Le cache opaque se DISSOUT pendant la reconstruction → la pilule redevient
    //  verre translucide et laisse réapparaître la (nouvelle) page.
    if (cover) tl.to(cover, { opacity: 0, duration: 1.5, ease: "power2.inOut" }, 0.4);
    if (title) {
      // Le titre affiche d'abord le NOM DE DESTINATION (résolu, lisible).
      renderScramble(title, from, from, 1);
      tl.to(title, { fontSize: 14 * z, duration: 0.78, ease: "power2.in" }, 0);
      tl.to(title, { fontSize: 14, duration: 1.5, ease: "power3.out" }, 0.78);
      // LE MATRIX DÉMARRE dès que la navbar COMMENCE À SE REPLIER (~0.15) et résout
      //  PENDANT le slide retour (miroir exact de l'intro) : le nom morphe → LOGO.
      tl.to(
        prog,
        {
          p: 1,
          duration: 2.35,
          ease: "none",
          onUpdate: () => renderScramble(title, from, LOGO, Math.min(1, prog.p / 0.9)),
        },
        0.15,
      );
      // une fois la barre posée (~1.45), le titre glisse vers la place du logo
      // (miroir de l'intro), puis s'efface, le vrai logo réapparaît.
      tl.to(title, { x: -centerDx.current, duration: 0.42, ease: "power2.inOut" }, 2.28);
      tl.to(title, { autoAlpha: 0, duration: 0.42, ease: "power2.out" }, 2.62);
    }
    // la barre (verre) reprend la main : le vrai logo réapparaît à gauche — fondu
    // plus long et chevauchant le titre pour un atterrissage doux (pas de claquement).
    if (bar) tl.to(bar, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, 2.55);
  }, []);

  // SORTIE : centrage du logo, puis la pilule se déplie (LARGEUR puis HAUTEUR).
  const run = useCallback(
    (href: string, label?: string, projectClose = false, cinemaNav = false) => {
      if (animating.current) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const pill = pillRef.current;
      const title = titleRef.current;
      const bar = barRef.current;
      const logo = logoRef.current;
      const menu = menuRef.current;
      const cover = coverRef.current;
      if (reduce || !pill || !title || !bar) {
        router.push(href);
        return;
      }
      animating.current = true;
      const text = (label ?? labelFor(href)).toUpperCase();
      titleText.current = text;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Rect de la BARRE (toujours hauteur de barre) = cible du repli + freeze.
      const pr = bar.getBoundingClientRect();
      rest.current = { left: pr.left, top: pr.top, width: pr.width, height: pr.height };
      awaiting.current = true;

      // Décalage logo→centre : le titre scramblé démarre À LA PLACE DU LOGO puis
      // glisse au centre (donc x part de -dx pour atteindre 0).
      let dx = 0;
      if (logo) {
        const lr = logo.getBoundingClientRect();
        dx = pr.left + pr.width / 2 - (lr.left + lr.width / 2);
      }
      centerDx.current = dx;

      // On neutralise les transitions CSS (sinon elles se battent avec gsap).
      pill.style.transition = "none";
      if (menu) menu.style.transition = "none";
      // titre placé À LA PLACE DU LOGO (x = -dx), prêt à scrambler puis glisser
      gsap.set(title, { x: -dx, autoAlpha: 0, fontSize: 14 });
      renderScramble(title, LOGO, text, 0); // morphe LOGO → nom de destination
      const prog = { p: 0 };

      const tl = gsap.timeline();
      tl.timeScale(speedRef.current); // vitesse globale (réglage back-office)
      // ── 1) LE MATRIX D'ABORD, SUR PLACE : le vrai logo s'efface, le titre
      //    scramblé apparaît à sa place et tourne (avant tout déplacement).
      tl.to(bar, { autoAlpha: 0, duration: 0.2, ease: "power2.inOut" }, 0);
      tl.to(title, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, 0.04);
      if (menu)
        tl.to(menu, { autoAlpha: 0, gridTemplateRows: "0fr", duration: 0.26, ease: "power2.inOut" }, 0);
      // le Matrix tourne jusqu'à ce que le titre se POSE dans le viseur (résout en
      // toute fin de déploiement).
      tl.to(
        prog,
        {
          p: 1,
          duration: 1.55,
          ease: "none",
          onUpdate: () => renderScramble(title, LOGO, text, Math.min(1, prog.p / 0.94)),
        },
        0,
      );

      // ── 2) LE TITRE GLISSE AU MILIEU DE LA BARRE (beat d'intro, pilule encore
      //    pleine taille) : c'est le « se mettre au milieu » du tout début.
      tl.to(title, { x: 0, duration: 0.38, ease: "power2.inOut" }, 0.04);
      // Une fois centré, on déclenche le dézoom SYNCHRONE page + navbar (event cadre).
      tl.call(
        () =>
          window.dispatchEvent(
            new CustomEvent("ac:page-exit", {
              detail: { href, projectClose, cinemaNav },
            }),
          ),
        undefined,
        0.4,
      );

      // ── 3) La pilule se fige, DÉZOOME avec la page (mini-barre en haut du 1er
      //    cadre), PUIS se déplie pour remplir ce 1er cadre. Tout en géométrie.
      const z = MIN_ZOOM;
      // mini-barre = la barre mise à l'échelle z vers le CENTRE écran (= comme si
      // elle était un élément statique de la page qui dézoome).
      const dzLeft = vw / 2 + (rest.current.left - vw / 2) * z;
      const dzTop = vh / 2 + (rest.current.top - vh / 2) * z;
      const dzW = rest.current.width * z;
      const dzH = rest.current.height * z;
      // 1er cadre (carré central de la page dézoomée).
      const inset = (1 - z) / 2;
      const fLeft = vw * inset;
      const fTop = vh * inset;
      const fW = vw * z;
      const fH = vh * z;
      pill.style.transition = "none";
      gsap.set(pill, {
        position: "fixed",
        left: rest.current.left,
        top: rest.current.top,
        width: rest.current.width,
        height: rest.current.height,
        maxWidth: "none",
        margin: 0,
        zIndex: 80,
        borderRadius: RADIUS,
      });
      // CACHE OPAQUE : pendant le déploiement, le calque plein monte en opacité
      //  jusqu'à 100 % au palier → masque totalement le swap des deux pages.
      if (cover) tl.to(cover, { opacity: 1, duration: 1.15, ease: "power2.inOut" }, 0.4);
      // Phase A : APRÈS l'intro, DÉZOOM lesté (pull-back caméra) synchro avec la page
      //  → mini-barre en haut du 1er cadre. `power3.inOut` = poids + décélération.
      tl.to(
        pill,
        { left: dzLeft, top: dzTop, width: dzW, height: dzH, duration: 0.72, ease: "power3.inOut" },
        0.4,
      );
      tl.to(title, { fontSize: 14 * z, duration: 0.72, ease: "power3.inOut" }, 0.4);
      // Phase C : DÉPLOIEMENT dans le 1er cadre, en chevauchant la fin du dézoom
      //  (aucun arrêt mort) et en DÉCÉLÉRANT (`power2.out`) → le titre se pose.
      tl.to(
        pill,
        { left: fLeft, top: fTop, width: fW, height: fH, borderRadius: 0, duration: 0.5, ease: "power2.out" },
        1.05,
      );
      // Taille PLAFONNÉE pour que le nom ENTIER tienne dans le cadre (un titre long
      // déborderait de la pilule en overflow:hidden et serait rogné).
      const bigSize = fitFontSize(
        text,
        fW * 0.9,
        Math.min(fW * 0.13, fH * 0.22),
      );
      tl.to(
        title,
        { fontSize: bigSize, duration: 0.5, ease: "power2.out" },
        1.05,
      );
      // PERF mobile : une fois le cache quasi opaque (~1.2), on SUSPEND le backdrop-blur
      // (invisible derrière le cache) → le déploiement plein écran ne re-floute plus le
      // viewport à chaque frame. Restauré à la fin du reveal() (barre reposée).
      tl.call(() => pill.classList.add("glass-paused"), undefined, 1.2);
      // PALIER DE LECTURE : le nom posé (~1.5) reste lisible un court instant avant
      // de naviguer.
      tl.call(() => router.push(href), undefined, 1.92);
      safety.current = window.setTimeout(() => reveal(), 3000 / speedRef.current);
    },
    [router, reveal],
  );

  // Repli déclenché quand la nouvelle page est montée.
  useEffect(() => {
    pathRef.current = pathname;
    if (first.current) {
      first.current = false;
      return;
    }
    reveal();
  }, [pathname, reveal]);

  // RETOUR DU LOADER DE DÉMARRAGE : le loader a fait l'aller (blanc → titre →
  // dézoom → cadre dessiné). Ici on place la pilule dans le 1er cadre (état de fin
  // de déploiement de l'aller) puis on lance le VRAI reveal() → retour identique à
  // un changement de page (navbar reconstruite + page qui rezoome hors du cadre).
  useEffect(() => {
    const onIntroReturn = () => {
      const pill = pillRef.current;
      const bar = barRef.current;
      const title = titleRef.current;
      const logo = logoRef.current;
      const menu = menuRef.current;
      const cover = coverRef.current;
      if (!pill || !bar || animating.current) return;
      animating.current = true;
      titleText.current = LOGO;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const z = MIN_ZOOM;
      const pr = bar.getBoundingClientRect();
      rest.current = { left: pr.left, top: pr.top, width: pr.width, height: pr.height };
      let dx = 0;
      if (logo) {
        const lr = logo.getBoundingClientRect();
        dx = pr.left + pr.width / 2 - (lr.left + lr.width / 2);
      }
      centerDx.current = dx;
      // pilule figée pleine dans le 1er cadre (= fin de la Phase C de l'aller).
      const inset = (1 - z) / 2;
      const fLeft = vw * inset;
      const fTop = vh * inset;
      const fW = vw * z;
      const fH = vh * z;
      pill.style.transition = "none";
      pill.classList.add("glass-paused"); // plein écran + cache opaque → blur inutile (cher)
      gsap.set(pill, {
        position: "fixed",
        left: fLeft,
        top: fTop,
        width: fW,
        height: fH,
        maxWidth: "none",
        margin: 0,
        zIndex: 80,
        borderRadius: 0,
      });
      gsap.set(bar, { autoAlpha: 0 });
      if (menu) gsap.set(menu, { autoAlpha: 0, gridTemplateRows: "0fr" });
      if (title) {
        gsap.set(title, {
          autoAlpha: 1,
          x: 0,
          fontSize: fitFontSize(LOGO, fW * 0.9, Math.min(fW * 0.13, fH * 0.22)),
        });
        renderScramble(title, LOGO, LOGO, 1);
      }
      // au palier, le cache est OPAQUE (plein) → reveal() le dissout ensuite.
      if (cover) gsap.set(cover, { opacity: 1 });
      awaiting.current = true;
      reveal();
    };
    window.addEventListener("ac:intro-return", onIntroReturn);
    return () => window.removeEventListener("ac:intro-return", onIntroReturn);
  }, [reveal]);

  // Fermeture au clic EN DEHORS de la pilule (utile surtout sur tactile, où il n'y a pas
  // de `mouseleave` pour refermer). Sur souris, le `mouseleave` s'en charge déjà.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  // Interception des clics sur liens internes (capture → avant next/link).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Toggle back-office : transitions désactivées → navigation normale (instantanée).
      if (!transitionsEnabled) return;
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      )
        return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      if (
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        a.dataset.noTransition !== undefined
      )
        return;
      const href = a.getAttribute("href");
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      const p = url.pathname;
      if (p === pathRef.current) return;
      if (p.startsWith("/admin")) return;
      // Les pages projet sont exclues PAR DÉFAUT : cliquer une cover sur le cinéma
      // joue la transition custom d'ouverture. Un lien explicitement marqué
      // `data-page-transition` (préc./suiv. dans le cadre) FORCE la transition de
      // page standard — `data-page-label` fournit le vrai titre au décodage Matrix.
      const force = a.dataset.pageTransition !== undefined;
      if (!force && /^\/projects\/[^/]+$/.test(p)) return;
      e.preventDefault();
      e.stopPropagation();
      const projectClose = a.dataset.projectClose !== undefined;
      const cinemaNav = a.dataset.cinemaNav !== undefined; // destination = cinéma projets
      // Retour projet → cinéma : on pose le slug de recentrage AVANT la navigation (le
      // onClick du lien ne s'exécute pas, la propagation étant stoppée ci-dessus).
      if (projectClose && a.dataset.returnSlug) markReturn(a.dataset.returnSlug);
      run(
        url.pathname + url.search + url.hash,
        a.dataset.pageLabel,
        projectClose,
        cinemaNav,
      );
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [run, transitionsEnabled]);

  // Jeux de classes selon la teinte.
  const halo = dark
    ? "[text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_12px_rgba(0,0,0,0.4)]"
    : "[text-shadow:0_0_3px_rgba(255,255,255,1),0_0_7px_rgba(255,255,255,0.95),0_1px_2px_rgba(255,255,255,0.9)]";
  const dotColor = dark ? "bg-white" : "bg-neutral-900";
  const itemActive = dark ? "text-white" : "text-neutral-900";
  const itemIdle = dark
    ? "text-white/70 group-hover:text-white"
    : "text-neutral-900/45 group-hover:text-neutral-900";
  const numActive = dark ? "text-white/70" : "text-neutral-900/60";
  const numIdle = dark ? "text-white/30" : "text-neutral-900/30";
  const arrow = dark ? "text-white/50" : "text-neutral-900/45";

  return (
    <header
      ref={headerRef}
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-4 md:pt-6"
    >
      <div
        ref={pillRef}
        onMouseEnter={canHover ? () => setOpen(true) : undefined}
        onMouseLeave={canHover ? () => setOpen(false) : undefined}
        className={cn(
          "glass-refract pointer-events-auto relative flex w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] md:w-[21rem] md:max-w-[calc(100vw-2rem)]",
          dark
            ? open
              ? "bg-black/60 shadow-[0_18px_50px_-10px_rgba(0,0,0,0.55)] ring-1 ring-white/25"
              : "bg-black/45 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
            : open
              ? "bg-white/90 shadow-[0_18px_50px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/70"
              : "bg-white/18 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.3)] ring-1 ring-white/40",
        )}
      >
        {/* cache opaque (sous le titre) : monte en opacité au palier pour masquer
            totalement le swap des deux pages, puis se dissout au retour */}
        <div
          ref={coverRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0",
            dark ? "bg-neutral-950" : "bg-white",
          )}
        />

        {/* reflet supérieur, touche « glass » */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

        {/* titre décrypté pendant la transition (centré, grandit ; couleur = ton
            de la barre pour rester lisible sur le verre, plus de voile sombre) */}
        <div
          ref={titleRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center justify-center whitespace-nowrap font-mono text-sm font-semibold uppercase tracking-[0.18em] opacity-0",
            dark ? "text-white" : "text-neutral-900",
            halo,
          )}
        />

        {/* Barre : logo + bouton points */}
        <div
          ref={barRef}
          data-nav-bar
          className={cn(
            "relative flex items-center justify-between px-5 py-3.5",
            dark ? "text-white" : "text-neutral-900",
            halo,
          )}
        >
          {/* Le logo N'EST PLUS un lien vers l'accueil : cliquer dessus OUVRE le menu
              (comme le survol). L'accueil reste accessible via le 1er item du menu. */}
          <button
            type="button"
            ref={logoRef}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em]"
          >
            Ambre Clément
          </button>
          <button
            type="button"
            ref={dotsRef}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "grid shrink-0 grid-cols-2 p-1.5 drop-shadow-[0_0_2px_rgba(255,255,255,0.95)] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]",
              open ? "rotate-[225deg] gap-[2px]" : "gap-[3px]",
            )}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("size-[3.5px] rounded-full", dotColor)}
              />
            ))}
          </button>
        </div>

        {/* Contenu révélé au survol (auto-hauteur via grid-rows) */}
        <div
          ref={menuRef}
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="relative overflow-hidden">
            <div
              className={cn(
                "relative flex flex-col px-5 pb-5 pt-1 transition-opacity duration-300",
                dark ? "text-white" : "text-neutral-900",
                halo,
                open ? "opacity-100 delay-150" : "opacity-0",
              )}
            >
              <nav aria-label="Navigation principale" className="py-3">
                <ul className="flex flex-col">
                  {items.map((item, i) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          data-cinema-nav={item.cinema ? "" : undefined}
                          className="group flex items-center justify-between py-1"
                        >
                          <span className="flex items-baseline gap-3">
                            <span
                              className={cn(
                                "text-[1.7rem] font-light uppercase leading-tight tracking-wide transition-all duration-300 group-hover:translate-x-1",
                                active ? itemActive : itemIdle,
                              )}
                            >
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[10px] transition-colors",
                                active ? numActive : numIdle,
                              )}
                            >
                              {pad(i + 1)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100",
                              arrow,
                            )}
                          >
                            ↗
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
