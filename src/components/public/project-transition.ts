/**
 * Transition d'ouverture / fermeture de projet — MIROIR EXACT de la transition de
 * page (cf. `site-header.tsx` + `site-frame.tsx`), mais :
 *   - la NAVBAR ne bouge JAMAIS (on ne touche pas à la pilule : on se contente de
 *     dispatcher `ac:page-exit`/`ac:page-enter`, que la navbar n'écoute pas ; et la
 *     route `/projects/[slug]` est déjà exclue de son intercepteur de clics) ;
 *   - la photo de COUVERTURE est un ÉLÉMENT PARTAGÉ : un clone unique posé sur
 *     `document.body` (hors React → survit à la navigation) transitionne sans
 *     rupture entre le cinéma (grande couverture centrée) et la galerie (1re photo).
 *
 * ALLER  (cinéma → galerie) : la page DÉZOOME (identique au changement de page),
 *   le clone vole de la couverture vers le 1er cadre central, on navigue, puis la
 *   galerie REZOOME et le clone se cale sur la 1re photo avant de se fondre.
 * RETOUR (galerie → cinéma) : inverse, avec un REBOND spring (`elastic`) élégant à
 *   l'atterrissage sur la couverture → illusion d'un seul et même objet.
 */
import gsap from "gsap";
import { pageZoom, pageOffset, projectReveal, MIN_ZOOM } from "@/lib/page-zoom";

const Z = MIN_ZOOM; // facteur de dézoom (0.2), identique à la transition de page

type Rect = { left: number; top: number; width: number; height: number };
type Mode = "open" | "close";

interface Pending {
  mode: Mode;
  src: string;
  alt: string;
  /** objectFit du CONTEXTE D'ARRIVÉE (galerie = cover ; cinéma = contain). */
  destContain: boolean;
}

let overlay: HTMLDivElement | null = null;
let imgEl: HTMLImageElement | null = null;
let pending: Pending | null = null;
/** Une révélation est en cours → ignore les ré-appels (Strict Mode) de `finishReveal`. */
let revealActive = false;
/** Timeline de la révélation d'ouverture (zoom + pan + clip de la galerie). */
let revealTl: gsap.core.Timeline | null = null;

/** Facteur de vitesse (timeScale) de l'ouverture projet — réglage back-office. Posé par
 *  `openProject`/`closeProject`, lu par `finishReveal` (galerie) ET le SiteFrame (cadre)
 *  → tout reste synchro. */
let projectSpeed = 1;
export function getProjectSpeed(): number {
  return projectSpeed;
}
/** Slug du projet vers lequel le cinéma doit se recentrer au retour. */
let returnSlug: string | null = null;

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Le « 1er cadre » central (carré de la page dézoomée) = exactement la zone que le
 *  `SiteFrame` borde (inset `(1-Z)/2`, taille `Z×viewport`). La couverture le REMPLIT
 *  → dans le petit cadre on ne voit QUE la couverture (le liseré l'affleure 1px dehors). */
function centerFrameRect(): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: (vw * (1 - Z)) / 2,
    top: (vh * (1 - Z)) / 2,
    width: vw * Z,
    height: vh * Z,
  };
}

/** Rect RÉEL de l'image affichée (corrige le letterbox d'`object-contain`) → le clone
 *  démarre pile sur la couverture visible, sans saut au clic. */
function containedRect(img: HTMLImageElement): Rect {
  const box = img.getBoundingClientRect();
  const nw = img.naturalWidth || box.width;
  const nh = img.naturalHeight || box.height;
  const boxAspect = box.width / box.height;
  const imgAspect = nw / nh;
  let w = box.width;
  let h = box.height;
  if (imgAspect > boxAspect) h = box.width / imgAspect;
  else w = box.height * imgAspect;
  return {
    left: box.left + (box.width - w) / 2,
    top: box.top + (box.height - h) / 2,
    width: w,
    height: h,
  };
}

/** Construit le clone partagé (image + bordure « petit cadre ») sur `document.body`. */
function buildOverlay(rect: Rect, src: string, alt: string, contain: boolean) {
  destroyOverlay();
  const wrap = document.createElement("div");
  wrap.setAttribute("data-ac-proj-clone", "");
  Object.assign(wrap.style, {
    position: "fixed",
    left: "0",
    top: "0",
    margin: "0",
    zIndex: "20", // au-dessus de la PAGE (z-0) mais SOUS le cadre (z-30) et la navbar
    //              (z-50) → on masque la page dans le petit cadre, mais le liseré du
    //              « petit cadre » reste visible autour de la couverture.
    overflow: "hidden",
    pointerEvents: "none",
    willChange: "transform, width, height",
    // fond TRANSPARENT : quand l'image se fond (ouverture), la galerie clippée apparaît
    // À TRAVERS le clone, et c'est la BORDURE du clone (le petit cadre) qui s'ouvre.
    backgroundColor: "transparent",
  });
  const im = document.createElement("img");
  im.src = src;
  im.alt = alt;
  im.decoding = "sync";
  Object.assign(im.style, {
    width: "100%",
    height: "100%",
    objectFit: contain ? "contain" : "cover",
    display: "block",
  });
  wrap.appendChild(im);
  document.body.appendChild(wrap);
  overlay = wrap;
  imgEl = im;
  gsap.set(wrap, {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    xPercent: 0,
    yPercent: 0,
    transformOrigin: "0 0",
  });
}

/** Retire le clone DOM (sans toucher au flag de révélation ni au pan). */
function removeClone() {
  if (overlay) {
    gsap.killTweensOf(overlay);
    if (imgEl) gsap.killTweensOf(imgEl);
    overlay.remove();
  }
  overlay = null;
  imgEl = null;
}

function stopReveal() {
  if (revealTl) {
    revealTl.kill();
    revealTl = null;
  }
}

/** Remet la galerie dans son état NORMAL (zoom plein, pas de pan, pas de clip, et
 *  surtout : `<main>` SANS transform — le SiteFrame peut l'avoir scalé à 20 %). */
function resetGallery() {
  pageZoom.value = 1;
  pageOffset.value = [0, 0];
  const main = document.querySelector<HTMLElement>("main");
  if (main) {
    gsap.set(main, { clearProps: "transform,transformOrigin" });
    main.style.clipPath = "";
  }
  const c = document.querySelector<HTMLElement>("[data-page-clip]");
  if (c) c.style.clipPath = "";
}

function destroyOverlay() {
  removeClone();
  stopReveal();
  revealActive = false;
  projectReveal.active = false; // la galerie reprend la main sur son clip
  pageOffset.value = [0, 0]; // sécurité : ne jamais laisser un pan résiduel
}

// ── ALLER : cinéma → galerie ────────────────────────────────────────────────
export function openProject(
  img: HTMLImageElement,
  slug: string,
  navigate: () => void,
  speed = 1,
  hudInfo?: {
    title: string;
    location: string | null;
    year: string | null;
    index: number;
    total: number;
  } | null,
) {
  if (reduced()) {
    navigate();
    return;
  }
  projectSpeed = speed; // posé pour la galerie (finishReveal) + le cadre (SiteFrame)
  // Pré-arme dès maintenant : quand la galerie montera, sa boucle de clip restera en
  // retrait (c'est finishReveal qui pilote le clip pendant toute l'ouverture).
  projectReveal.active = true;
  const start = containedRect(img);
  const src = img.currentSrc || img.src;
  // object-cover → en rétrécissant vers le cadre carré, la couverture le REMPLIT
  // (on ne voit qu'elle dans le petit cadre, jamais la page).
  buildOverlay(start, src, img.alt, false);
  // DÉZOOM identique au changement de page (cadre + coins + Matrix). Navbar intacte.
  // On passe les infos du projet destination → le HUD PERSISTE pendant l'ouverture
  // (calque z-90 du cadre), comme lors d'un changement projet → projet. Pas de `href`
  // dans le detail : la navbar (qui lit `href`) n'est donc pas affectée.
  window.dispatchEvent(
    new CustomEvent("ac:page-exit", {
      detail: { projectInfo: hudInfo ?? null },
    }),
  );

  // CIBLE = le petit cadre central ENTIER (et non la position dézoomée de la photo) :
  // la couverture le remplit, masquant la page dézoomée derrière.
  const target = centerFrameRect();
  // CLIPPE le clone au PETIT CADRE (coords écran) → la couverture ne DÉPASSE JAMAIS le
  // cadre, même grande au départ. Appliqué de façon SYNCHRONE dès maintenant (avant le
  // 1er rendu) PUIS à chaque frame → aucune frame non-clippée (le bug « de temps en temps »).
  const clipToFrame = () => {
    if (!overlay) return;
    const r = overlay.getBoundingClientRect();
    const top = Math.max(0, target.top - r.top);
    const left = Math.max(0, target.left - r.left);
    const right = Math.max(0, r.right - (target.left + target.width));
    const bottom = Math.max(0, r.bottom - (target.top + target.height));
    overlay.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  };
  clipToFrame(); // ⚡ immédiat, avant tout paint
  const tl = gsap.timeline();
  tl.timeScale(speed); // vitesse globale (réglage back-office)
  // même courbe/durée que la Phase A de la navbar et du cadre (`power3.inOut`, 0.72).
  tl.to(
    overlay,
    {
      x: target.left,
      y: target.top,
      width: target.width,
      height: target.height,
      duration: 0.72,
      ease: "power3.inOut",
      onUpdate: clipToFrame,
    },
    0,
  );
  // à l'arrivée (clone = petit cadre), on retire le clip → la suite (galerie) est libre.
  tl.set(overlay, { clipPath: "" }, 0.72);
  // court palier de lecture puis navigation ; le clone PERSISTE (hors React).
  tl.call(
    () => {
      pending = { mode: "open", src, alt: img.alt, destContain: false };
      navigate();
    },
    undefined,
    0.92,
  );
}

/** Marque le projet d'où l'on revient → le cinéma se recentrera dessus au montage. */
export function markReturn(slug: string) {
  returnSlug = slug;
}

/** Slug à recentrer au retour (consommé par le cinéma au montage). */
export function consumeReturnSlug(): string | null {
  const s = returnSlug;
  returnSlug = null;
  return s;
}

/** Rect FINAL (page rezoomée) à partir d'un rect mesuré pendant le dézoom : on
 *  inverse l'homothétie centre-écran ×s appliquée à `<main>` (cinéma sans WebGL). */
function unscaleRect(r: Rect, s: number): Rect {
  if (s >= 0.999) return r;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return {
    left: cx + (r.left - cx) / s,
    top: cy + (r.top - cy) / s,
    width: r.width / s,
    height: r.height / s,
  };
}

/** Cible d'arrivée du clone sur la page de destination (rect FINAL, page rezoomée). */
function findDestRect(mode: Mode): Rect | null {
  if (mode === "open") {
    // Galerie WebGL : le DOM `[data-plane]` n'est PAS transformé (le shader gère le
    // zoom) → son rect est déjà la position finale.
    const plane = document.querySelector("[data-plane]");
    return plane ? rectOf(plane) : null;
  }
  // Cinéma (sans WebGL) : `<main>` est scalé ×pageZoom → on inverse pour viser la
  // position finale (pleine échelle) de la couverture.
  const cover = document.querySelector("[data-cinema-cover] img");
  return cover ? unscaleRect(rectOf(cover), pageZoom.value) : null;
}

/**
 * À appeler au MONTAGE de la page de destination (galerie ou cinéma). Si une
 * transition est en cours : relance le REZOOM (identique au changement de page) et
 * cale le clone sur la photo de destination, puis le fond.
 */
export function finishReveal() {
  // STRICT MODE (dev) appelle l'effet de montage DEUX fois → ne pas re-détruire le
  // clone d'une révélation déjà en cours (sinon `overlay` devient null en plein vol).
  if (revealActive) return;
  if (!pending || !overlay) {
    // Pas de transition projet custom en cours. Deux cas :
    //  • pageZoom < 1 → une TRANSITION DE PAGE standard nous amène (préc./suiv. projet,
    //    bouton retour). C'est `onEnter` (SiteFrame) qui pilote le rezoom : on ne force
    //    SURTOUT PAS pageZoom à 1 (sinon la galerie peint plein écran puis snap dans le
    //    cadre → blink). On laisse l'état tel quel.
    //  • pageZoom ≈ 1 → accès direct (URL) : état PROPRE garanti (pas de zoom/pan/clip
    //    résiduel d'une transition interrompue, sinon galerie cassée).
    destroyOverlay();
    pending = null;
    if (pageZoom.value >= 0.999) {
      pageZoom.value = 1;
      pageOffset.value = [0, 0];
      const c = document.querySelector<HTMLElement>("[data-page-clip]");
      if (c) c.style.clipPath = "";
    }
    return;
  }
  revealActive = true;
  const { mode, destContain } = pending;
  pending = null;
  if (imgEl) imgEl.style.objectFit = destContain ? "contain" : "cover";

  if (mode === "open") {
    // « LE CADRE OUVRE LA GALERIE DEPUIS LA 1re PHOTO ». Nettoyage <main> (peut être
    // scalé 0.2 par le SiteFrame). Mécanique :
    //  1) le clone (couverture) GLISSE du petit cadre central vers la CASE RÉELLE de la
    //     1re photo (haut-gauche), à sa taille zoomée — galerie cachée pendant le glide ;
    //  2) le CADRE S'OUVRE depuis cette case (le clip = fenêtre autour de la photo →
    //     plein écran) pendant que la galerie DÉZOOME, focal sur la 1re photo qui RESTE
    //     FIXE à sa place. Le clone se fond, la vraie galerie prend le relais.
    const mainEl = document.querySelector<HTMLElement>("main");
    if (mainEl) gsap.set(mainEl, { clearProps: "transform,transformOrigin" });

    // La liste « cinéma » défile la fenêtre (elle fait n×100vh) : quand on ouvre un
    // projet situé PLUS BAS, le scroll natif n'est pas encore remis à 0 au moment de
    // ce 1er layout de la galerie. On le force AVANT toute mesure, sinon le rect de la
    // 1re photo est décalé du scroll résiduel → la couverture atterrit à côté (bug
    // « le 1er projet s'ouvre bien, pas les autres »). Au sommet (1er projet) : no-op.
    window.scrollTo(0, 0);

    const canvas = document.querySelector<HTMLElement>("[data-page-clip]");
    const plane = document.querySelector<HTMLElement>("[data-plane]");
    if (!canvas || !plane || plane.getBoundingClientRect().width < 1 || !overlay) {
      resetGallery();
      window.dispatchEvent(new Event("ac:page-enter"));
      destroyOverlay();
      return;
    }
    // MOBILE + TABLETTE (< 1024px) : la révélation "clip-opening + dézoom" ci-dessous est
    // calibrée desktop et suppose des photos à HAUTEUR FIXE. Or sous 1024px les photos sont
    // en hauteur AUTO → au montage leur taille n'est pas fiable → la reveal desktop casse
    // (atterrissage de travers). Version SIMPLE et robuste, isolée du desktop : la galerie
    // s'affiche pleine, le clone (couverture) attend que la 1re photo soit dimensionnée puis
    // glisse se caler PILE dessus et se fond. Le vol d'ouverture (aller) est conservé.
    if (window.innerWidth < 1024) {
      window.dispatchEvent(new Event("ac:project-reveal")); // efface le cadre + décode texte
      resetGallery(); // pageZoom = 1, <main> sans transform
      // On CACHE la galerie (clip nul) tant que le clone n'est pas calé sur la 1re photo :
      // sinon on voit EN MÊME TEMPS la vraie 1re photo ET le clone (couverture) = doublon.
      const mainEl2 = document.querySelector<HTMLElement>("main");
      canvas.style.clipPath = "inset(50%)";
      if (mainEl2) mainEl2.style.clipPath = "inset(50%)";
      const finish = () => {
        removeClone();
        revealActive = false;
        projectReveal.active = false; // la galerie reprend son clip normal
        // Ouverture (mobile) terminée → même handoff que desktop : le HUD repasse dans le
        // cadre (z-30, derrière la lightbox) et tout brouillage Matrix restant est figé.
        window.dispatchEvent(new Event("ac:hud-release"));
      };
      const reveal = () => {
        canvas.style.clipPath = "";
        if (mainEl2) mainEl2.style.clipPath = "";
        if (imgEl)
          gsap.to(imgEl, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut",
            onComplete: finish,
          });
        else finish();
      };
      // La 1re photo est en HAUTEUR AUTO sur mobile : au montage sa taille/position n'est
      // pas fiable (petite, centrée) puis elle grandit. On ATTEND qu'elle soit vraiment
      // dimensionnée (≥ 30% de l'écran) avant de mesurer et glisser — sinon le clone se
      // cale sur une fausse position minuscule (bug observé).
      let tries = 0;
      const glideWhenReady = () => {
        if (!overlay) return finish();
        const r0 = rectOf(plane);
        if (r0.height < window.innerHeight * 0.3 && tries < 30) {
          tries++;
          requestAnimationFrame(glideWhenReady);
          return;
        }
        gsap.to(overlay, {
          x: r0.left,
          y: r0.top,
          width: r0.width,
          height: r0.height,
          duration: 0.5,
          ease: "power3.inOut",
          onComplete: () => {
            // Re-mesure PILE avant de révéler : le clone se cale exactement sur la 1re photo
            // même si la mise en page a encore bougé → aucun décalage clone→galerie.
            if (overlay) {
              const r1 = rectOf(plane);
              gsap.set(overlay, {
                x: r1.left,
                y: r1.top,
                width: r1.width,
                height: r1.height,
              });
            }
            reveal();
          },
        });
      };
      requestAnimationFrame(glideWhenReady);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = rectOf(plane); // case (slot) de la 1re photo, taille normale
    const ax = (2 * r.left) / vw - 1; // coin haut-gauche en clip (focal, neutre si Zs=1)
    const ay = 1 - (2 * r.top) / vh;
    // Zs = 1 : AUCUN zoom de la galerie → la 1re photo est À SA TAILLE FINALE dès le
    // départ et NE RÉTRÉCIT PAS pendant l'ouverture. C'est le CADRE qui s'ouvre
    // par-dessus la galerie (fixe), révélant les autres photos depuis la 1re.
    const Zs = 1;
    // rect de la 1re photo au palier = sa case réelle (taille normale).
    const pw = r.width * Zs;
    const ph = r.height * Zs;
    const px = r.left;
    const py = r.top;

    // focal sur le coin haut-gauche (neutre quand Zs=1 → galerie statique).
    const applyZoom = (z: number) => {
      pageZoom.value = z;
      pageOffset.value = [ax * (1 - z), ay * (1 - z)];
    };
    // fenêtre (le CADRE) à l'instant t : du rect de la photo au palier → plein écran.
    const winAt = (t: number) => ({
      left: px * (1 - t),
      top: py * (1 - t),
      right: vw - (vw - (px + pw)) * (1 - t),
      bottom: vh - (vh - (py + ph)) * (1 - t),
    });
    const applyClip = (t: number) => {
      const w = winAt(t);
      const ins = `inset(${(w.top / vh) * 100}% ${((vw - w.right) / vw) * 100}% ${((vh - w.bottom) / vh) * 100}% ${(w.left / vw) * 100}%)`;
      canvas.style.clipPath = ins;
      if (mainEl) mainEl.style.clipPath = ins;
    };

    // état initial : focal prêt, galerie CACHÉE (clip nul) pendant le glide.
    applyZoom(Zs);
    canvas.style.clipPath = "inset(50%)";
    if (mainEl) mainEl.style.clipPath = "inset(50%)";

    window.dispatchEvent(new Event("ac:project-reveal")); // efface le cadre central + décode texte

    stopReveal();
    const e = { t: 0 };
    revealTl = gsap.timeline({
      onComplete: () => {
        resetGallery();
        removeClone();
        revealTl = null;
        revealActive = false;
        projectReveal.active = false; // révélation finie → la galerie reprend son clip
        // Ouverture terminée → le cadre rend la main au HUD du CADRE (z-30) et fige tout
        // brouillage Matrix restant. Sans ce signal, le HUD resterait sur le calque
        // persistant (z-90, au-dessus de la lightbox) et parfois figé en Matrix.
        window.dispatchEvent(new Event("ac:hud-release"));
      },
    });
    revealTl.timeScale(projectSpeed); // vitesse globale (synchro avec le cadre/SiteFrame)
    // PHASE 1 — LE PETIT CADRE (le clone : couverture + sa bordure) glisse du centre vers
    // la CASE de la 1re photo (coin haut-gauche figé). Galerie cachée (clip nul).
    revealTl.to(
      overlay,
      { x: px, y: py, width: pw, height: ph, duration: 0.55, ease: "power2.inOut" },
      0,
    );
    // PHASE 2 — LE PETIT CADRE S'OUVRE : c'est LE MÊME clone qui s'agrandit de la case au
    // plein écran (sa bordure = le cadre), son IMAGE se fond → la galerie clippée apparaît
    // À TRAVERS lui. La galerie dézoome (photo ancrée), couplée au cadre. Aucun cadre
    // ajouté : le petit cadre fait tout le travail.
    revealTl.to(
      e,
      {
        t: 1,
        duration: 1.9,
        ease: "power2.inOut",
        onUpdate: () => {
          applyZoom(Zs + (1 - Zs) * e.t);
          applyClip(e.t);
          const w = winAt(e.t);
          if (overlay)
            gsap.set(overlay, {
              x: w.left,
              y: w.top,
              width: w.right - w.left,
              height: w.bottom - w.top,
            });
          // L'IMAGE reste FIXE pile sur la case de la 1re photo (elle NE s'agrandit PAS
          // avec le cadre) → elle couvre EXACTEMENT la 1re photo de bout en bout, donc
          // zéro clignotement au passage clone→galerie. Seule la BORDURE (le cadre) s'ouvre.
          if (imgEl) {
            imgEl.style.position = "absolute";
            imgEl.style.left = px - w.left + "px";
            imgEl.style.top = py - w.top + "px";
            imgEl.style.width = pw + "px";
            imgEl.style.height = ph + "px";
          }
        },
      },
      0.55,
    );
    // l'image ne se fond qu'À LA TOUTE FIN (galerie stable) → la vraie 1re photo prend
    // le relais SANS rupture ; une fois posée, plus rien ne la touche.
    if (imgEl)
      revealTl.to(imgEl, { opacity: 0, duration: 0.4, ease: "power2.inOut" }, 1.9);
    return;
  }

  // RETOUR (bouton ←) : rezoom du cinéma (depuis le centre) + le clone rejoint la
  // couverture avec un REBOND spring — inchangé. 2 frames pour mesurer la page.
  window.dispatchEvent(new Event("ac:page-enter"));
  const HOLD = 0.78;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const dest = findDestRect("close");
      if (!dest) {
        if (overlay)
          gsap.to(overlay, { opacity: 0, duration: 0.4, onComplete: destroyOverlay });
        else destroyOverlay();
        return;
      }
      const tl = gsap.timeline({ onComplete: destroyOverlay });
      tl.to(
        overlay,
        {
          x: dest.left,
          y: dest.top,
          width: dest.width,
          height: dest.height,
          duration: 1.7,
          ease: "elastic.out(1, 0.62)",
        },
        HOLD,
      );
      tl.to(overlay, { opacity: 0, duration: 0.5, ease: "power2.out" }, HOLD + 1.35);
    }),
  );
}
