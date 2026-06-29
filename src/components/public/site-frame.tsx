"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useFrameMeta, type FrameMetaData } from "@/components/public/frame-context";
import { SOCIAL_ICONS } from "@/lib/socials";
import { isSocialPlatform, SOCIAL_META } from "@/lib/social-platforms";
import { SITE_URL } from "@/lib/seo";
import { pageZoom, MIN_ZOOM } from "@/lib/page-zoom";
import { getProjectSpeed } from "@/components/public/project-transition";
import type { SocialLink } from "@/server/db/schema";

// Layout effect SSR-safe (sinon warning au rendu serveur).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const pad3 = (n: number) => String(n).padStart(3, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");

// --- Effet Matrix / écriture, sur TOUT le texte, en gardant le TYPE de caractère
const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LO = "abcdefghijklmnopqrstuvwxyz";
const DI = "0123456789";
const pick = (s: string) => s[(Math.random() * s.length) | 0];
/** Brouille un caractère en gardant son type (chiffre↔chiffre, casse). Le reflux
 *  des titres est évité autrement : on force le texte sur une ligne (nowrap)
 *  pendant le Matrix (cf. `setNowrap`). */
function scrambleChar(ch: string) {
  if (ch >= "0" && ch <= "9") return pick(DI);
  if (/[a-zà-ÿ]/.test(ch)) return pick(LO);
  if (/[A-ZÀ-Ÿ]/.test(ch)) return pick(UP);
  return ch; // espaces et ponctuation conservés
}
const ALNUM = /[0-9A-Za-zÀ-ÿ]/;

// Mémoire de la VRAIE valeur de chaque nœud texte. Indispensable car certains
// nœuds du cadre (©, email, mentions) PERSISTENT entre les pages et React ne les
// ré-écrit JAMAIS : si on capturait leur valeur courante (déjà brouillée) comme
// « original », le décryptage les figerait en caractères aléatoires.
const realText = new WeakMap<Text, string>();
const lastWritten = new WeakMap<Text, string>(); // dernière valeur qu'ON a écrite

/** Vraie valeur d'un nœud : si la valeur courante ≠ ce qu'on a écrit, c'est que
 *  React (ou le 1er rendu) y a mis le vrai texte → on (re)mémorise. Sinon le nœud
 *  est encore brouillé par nous → on rend la valeur mémorisée. */
function realOf(node: Text): string {
  const cur = node.nodeValue ?? "";
  const lw = lastWritten.get(node);
  if (lw === undefined || cur !== lw) {
    realText.set(node, cur);
    return cur;
  }
  return realText.get(node) ?? cur;
}
function write(node: Text, value: string) {
  node.nodeValue = value;
  lastWritten.set(node, value);
}

/** SORTIE : tout le texte devient aléatoire (cycle à chaque frame). */
function scrambleNode(node: Text) {
  const original = realOf(node);
  let s = "";
  for (const ch of original) s += ALNUM.test(ch) ? scrambleChar(ch) : ch;
  write(node, s);
}
/** ENTRÉE : décryptage gauche→droite (aléatoire → vrai texte) façon écriture. */
function decodeNode(node: Text, p: number) {
  const original = realOf(node);
  const n = original.length;
  let s = "";
  for (let i = 0; i < n; i++) {
    const ch = original[i];
    if (!ALNUM.test(ch)) {
      s += ch;
      continue;
    }
    const frac = n > 1 ? i / (n - 1) : 0;
    s += p >= 0.1 + frac * 0.85 ? ch : scrambleChar(ch);
  }
  write(node, s);
}
/** Fige le nœud sur sa vraie valeur (fin du décryptage). */
function resolveNode(node: Text) {
  write(node, realOf(node));
}

// --- Variante DOUCE « manuscrite » (sans brouillage), pour les pages chargées en
//     texte (Contact) où le Matrix scintille trop : le texte s'écrit / s'efface.
/** ÉCRITURE (entrée) : le texte apparaît de gauche à droite (p: 0→1). */
function writeNode(node: Text, p: number) {
  const original = realOf(node);
  write(node, original.slice(0, Math.round(original.length * p)));
}
/** EFFACEMENT (sortie) : le texte disparaît de droite à gauche (p: 0→1). */
function eraseNode(node: Text, p: number) {
  const original = realOf(node);
  write(node, original.slice(0, Math.round(original.length * (1 - p))));
}

/** Force `white-space: nowrap` (le temps du Matrix) UNIQUEMENT sur les textes qui
 *  tiennent déjà sur UNE SEULE LIGNE (titres, labels) → ils ne refluent plus.
 *  Les paragraphes multi-lignes sont laissés tels quels (sinon ils seraient écrasés
 *  sur une seule ligne, illisibles). Rétabli avec `on=false`. */
function setNowrap(nodes: Text[], on: boolean) {
  const seen = new Set<HTMLElement>();
  for (const n of nodes) {
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (!on) {
      el.style.whiteSpace = "";
      continue;
    }
    // mesure du nombre de fragments de ligne du nœud texte (1 = mono-ligne)
    const r = document.createRange();
    r.selectNodeContents(n);
    if (r.getClientRects().length <= 1) el.style.whiteSpace = "nowrap";
  }
}

/** Collecte les nœuds texte visibles d'une racine (hors script/style). On REJETTE
 *  les nœuds vides SAUF ceux qu'on a déjà animés (présents dans `realText`) : sinon
 *  un nœud du cadre vidé par l'effacement manuscrit ne serait plus recapturé donc
 *  jamais restauré → infos du cadre perdues. */
function collectTextNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const v = n.nodeValue;
      if ((!v || !v.trim()) && !realText.has(n as Text))
        return NodeFilter.FILTER_REJECT;
      const tag = n.parentElement?.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = w.nextNode())) out.push(node as Text);
  return out;
}

/** Contenu du HUD projet (droite) : grand numéro + Projet / Lieu / Année. Identique
 *  que le HUD soit dans le cadre (z-30, part avec lui) ou sur le calque persistant
 *  (z-90, projet → projet). */
function HudInner({
  info,
}: {
  info: NonNullable<FrameMetaData["projectInfo"]>;
}) {
  return (
    <>
      <div className="text-5xl font-light leading-none tabular-nums">
        {pad2(info.index)}
      </div>
      <div>
        <div className="text-[10px] tracking-[0.2em] opacity-60">Projet</div>
        <div className="mt-0.5 text-xs tracking-[0.15em]">{info.title}</div>
      </div>
      {info.location && (
        <div>
          <div className="text-[10px] tracking-[0.2em] opacity-60">Lieu</div>
          <div className="mt-0.5 text-xs tracking-[0.15em]">{info.location}</div>
        </div>
      )}
      {info.year && (
        <div>
          <div className="text-[10px] tracking-[0.2em] opacity-60">Année</div>
          <div className="mt-0.5 text-xs tracking-[0.15em]">{info.year}</div>
        </div>
      )}
    </>
  );
}

function domain() {
  try {
    const h = new URL(SITE_URL).host.replace(/^www\./, "");
    return h.includes("localhost") ? "ambreclement.com" : h;
  } catch {
    return "ambreclement.com";
  }
}


/**
 * Cadre global (fixe), en `mix-blend-difference`. Il porte la transition
 * synchronisée avec la navbar (events `ac:page-exit` / `ac:page-enter`) :
 *  - le cadre fait DÉZOOMER la page (scale, comme un cadre d'appareil photo) à
 *    la sortie, REZOOMER à l'entrée ; les repères suivent la zone cadrée ;
 *  - TOUT le texte (page + cadre) passe en Matrix à la sortie et se ré-écrit
 *    (décryptage gauche→droite) à l'entrée, en gardant nb + type de caractères.
 */
export function SiteFrame({
  socials,
  email,
  speed,
}: {
  socials: SocialLink[];
  email: string | null;
  speed: number;
}) {
  const ctx = useFrameMeta();
  const meta = ctx?.meta ?? null;
  const year = new Date().getFullYear();

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      /* presse-papier indisponible */
    }
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const tlc = useRef<HTMLSpanElement>(null);
  const trc = useRef<HTMLSpanElement>(null);
  const blc = useRef<HTMLSpanElement>(null);
  const brc = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null); // 1er cadre (autour de la page)
  const hudRef = useRef<HTMLDivElement>(null); // HUD infos projet (droite)

  // À chaque changement de page, si on est EN PLEINE TRANSITION (`pageZoom < 1`),
  // on dézoome <main> AVANT le 1er paint (galerie→non-galerie : sinon le contenu
  // s'affiche pleine taille 1-2 frames le temps que `onEnter` réagisse). `onEnter`
  // prend ensuite le relais (re-mesure + rezoom). Les galeries se gèrent elles-mêmes.
  const pathname = usePathname();
  // pathname courant accessible depuis les listeners (effet à deps []) — sert à
  // choisir l'effet manuscrit (doux) plutôt que le Matrix sur la page Contact.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  // facteur de vitesse (timeScale GSAP) accessible dans onExit/onEnter (effet []).
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // ── HUD projet (droite) ────────────────────────────────────────────────────
  // Cas NORMAL : le HUD fait PARTIE DU CADRE (z-30) → il part avec le cadre pendant
  //   la transition (démonté au trou meta=null, comme le reste du cadre).
  // Cas PERSISTANT (projet → projet : source ET destination ont des infos projet) :
  //   on bascule sur un calque qui SURVIT au trou meta=null et passe AU-DESSUS du
  //   voile navbar (z-90) → les infos restent en place pendant TOUTE l'animation puis
  //   se décodent (Matrix) vers le nouveau projet. `persistInfo` = infos de la source,
  //   affichées le temps du trou, avant que la destination ne pose son meta.
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);
  const [hudPersist, setHudPersist] = useState(false);
  const [persistInfo, setPersistInfo] = useState<
    NonNullable<FrameMetaData["projectInfo"]> | null
  >(null);
  // Armé par les events de transition (onExit/onEnter/onProjectReveal) → distingue un
  // VRAI changement/ouverture de projet d'un simple chargement direct d'URL (sans Matrix).
  const armDecode = useRef(false);
  // Décodage Matrix du HUD ACTIF (calque persistant OU HUD du cadre — un seul est monté,
  // les deux portent `hudRef`), au changement de projet, une fois le nouveau contenu écrit.
  const projKey = meta?.projectInfo
    ? `${meta.projectInfo.title}|${meta.projectInfo.index}`
    : null;
  useIsoLayoutEffect(() => {
    if (!projKey || !armDecode.current) return; // trou nav / page sans projet / chargement direct
    armDecode.current = false;
    const el = hudRef.current;
    if (!el) return;
    const nodes = collectTextNodes(el);
    if (!nodes.length) return;
    setNowrap(nodes, true);
    nodes.forEach((nd) => decodeNode(nd, 0)); // brouillage AVANT le paint → pas de flash du texte clair
    const p = { d: 0 };
    const tw = gsap
      .to(p, {
        d: 1,
        duration: 1.25,
        ease: "power2.in",
        onUpdate: () => nodes.forEach((nd) => decodeNode(nd, p.d)),
        onComplete: () => {
          nodes.forEach((nd) => resolveNode(nd));
          setNowrap(nodes, false);
        },
      })
      .timeScale(speedRef.current);
    return () => {
      tw.kill();
    };
  }, [projKey]);

  useIsoLayoutEffect(() => {
    if (pageZoom.value >= 0.999) return;
    if (document.querySelector("[data-page-clip]")) return;
    const main = document.querySelector<HTMLElement>("main");
    if (!main) return;
    gsap.set(main, { clearProps: "transform,transformOrigin" });
    const r = main.getBoundingClientRect();
    gsap.set(main, {
      scale: pageZoom.value,
      transformOrigin: `${window.innerWidth / 2 - r.left}px ${window.innerHeight / 2 - r.top}px`,
    });
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Origine du scale de <main> = CENTRE DE L'ÉCRAN (et pas le centre de <main>,
    // qui diffère si la page est plus haute que l'écran ou scrollée → sinon la
    // page zoome de travers et sort du cadre). Recalculée à chaque transition.
    let originX = 0;
    let originY = 0;
    // Prépare <main> : on enlève tout transform résiduel (sinon ça casse la galerie
    // ET fausse la mesure) puis on calcule l'origine = centre écran dans son repère.
    const prepMain = () => {
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return;
      gsap.set(main, { clearProps: "transform,transformOrigin" });
      const r = main.getBoundingClientRect();
      originX = window.innerWidth / 2 - r.left;
      originY = window.innerHeight / 2 - r.top;
    };

    const corners = () =>
      [tlc.current, trc.current, blc.current, brc.current].filter(
        Boolean,
      ) as HTMLElement[];
    // Texte du CONTENU de page (<main>) vs texte du CADRE (©/email/mentions/nom…).
    // Sur Contact, seul le CONTENU passe en manuscrit ; le CADRE reste en Matrix.
    const mainText = (): Text[] => {
      const main = document.querySelector<HTMLElement>("main");
      return main ? collectTextNodes(main) : [];
    };
    // Texte du CADRE hors HUD projet : le HUD a son propre décodage (`decodeHud`)
    // qui ATTEND son montage React (anti-course), donc on l'exclut ici pour éviter
    // un double-décodage concurrent.
    const frameText = (): Text[] =>
      rootRef.current
        ? collectTextNodes(rootRef.current).filter(
            (n) => !n.parentElement?.closest("[data-frame-hud]"),
          )
        : [];

    // v: 0 = page pleine ; 1 = page DÉZOOMÉE encapsulée dans le cadre appareil photo.
    // Niveau 1 : la page rapetisse (galerie WebGL via `pageZoom` lu par le shader ;
    //   autres pages via scale de <main> — sûr car pas de WebGL) → un 1er cadre
    //   apparaît à son bord. Niveau 2 : les repères caméra (cadre extérieur) se
    //   resserrent un peu, englobant le 1er cadre → effet de profondeur à 2 niveaux.
    // cosmeticsOnly : ne touche QUE le cadre (1er cadre + repères), pas le `pageZoom`
    // ni le scale de <main>. Sert à la révélation projet, où c'est la GALERIE qui
    // pilote son propre zoom (focalisé sur la 1re photo) pendant que le cadre se rouvre.
    const setFrame = (v: number, cosmeticsOnly = false) => {
      const z = 1 - (1 - MIN_ZOOM) * v; // 1 → MIN_ZOOM : dézoom FORT
      if (!cosmeticsOnly) pageZoom.value = z; // les galeries lisent ça dans leur rendu
      const mx = (window.innerWidth * (1 - z)) / 2;
      const my = (window.innerHeight * (1 - z)) / 2;

      // Galerie : le zoom (shader) ET le clip au 1er cadre sont gérés par la
      // galerie elle-même (elle lit `pageZoom` dans sa boucle de rendu → aucun
      // flash possible). Ici on ne scale <main> que pour les pages SANS WebGL.
      if (!cosmeticsOnly && !document.querySelector("[data-page-clip]")) {
        const main = document.querySelector<HTMLElement>("main");
        if (main)
          gsap.set(main, {
            scale: z,
            transformOrigin: `${originX}px ${originY}px`,
          });
      }

      // 1er cadre : rectangle bordé au bord de la page dézoomée, qui apparaît.
      // On le décale juste de l'épaisseur du trait (1 px) vers l'EXTÉRIEUR : le
      // liseré affleure ainsi exactement le bord de la pilule (qui se déploie
      // pile au 1er cadre) → la pilule rentre parfaitement, sans espace blanc, et
      // le trait reste visible (juste dehors, donc non recouvert par la pilule).
      const pad = 1 * v; // 1 px = épaisseur du liseré → affleurement, zéro écart
      if (innerRef.current)
        gsap.set(innerRef.current, {
          top: my - pad,
          bottom: my - pad,
          left: mx - pad,
          right: mx - pad,
          autoAlpha: v,
        });

      // 2e cadre (caméra) : les repères se resserrent, plus loin que le 1er.
      const ox = window.innerWidth * 0.2 * v;
      const oy = window.innerHeight * 0.2 * v;
      if (tlc.current) gsap.set(tlc.current, { x: ox, y: oy });
      if (trc.current) gsap.set(trc.current, { x: -ox, y: oy });
      if (blc.current) gsap.set(blc.current, { x: ox, y: -oy });
      if (brc.current) gsap.set(brc.current, { x: -ox, y: -oy });
    };

    // Timeline de SORTIE en cours (ac:page-exit) : on la garde pour pouvoir la TUER
    // si une révélation projet démarre (sinon elle continue d'écrire pageZoom → conflit).
    let exitTl: gsap.core.Timeline | null = null;

    // DÉCRYPTAGE du texte (entrée) — partagé par onEnter ET la révélation projet.
    // On capture le texte APRÈS que React ait écrit les NOUVEAUX libellés (2 frames),
    // sinon on décrypte vers l'ancien texte (caractères figés).
    const runDecode = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const soft = pathRef.current === "/contact";
          const mainNodes = mainText();
          const frameNodes = frameText();
          const fx = [...mainNodes, ...frameNodes];
          setNowrap(fx, true);
          const p = { d: 0 };
          gsap.to(p, {
            d: 1,
            duration: soft ? 1.05 : 1.25,
            ease: soft ? "power2.out" : "power2.in",
            onUpdate: () => {
              mainNodes.forEach((f) => (soft ? writeNode(f, p.d) : decodeNode(f, p.d)));
              frameNodes.forEach((f) => decodeNode(f, p.d));
            },
            onComplete: () => {
              fx.forEach((f) => resolveNode(f));
              setNowrap(fx, false);
            },
          }).timeScale(speedRef.current);
        }),
      );
    };

    // SORTIE : la page dézoome + tout le texte passe en Matrix.
    const onExit = (e: Event) => {
      // Destination connue dès le clic (navbar) → décide si le HUD projet PERSISTE
      // (projet → projet : source ET destination ont des infos) ou s'il part avec le
      // cadre (toute autre destination).
      const href = (e as CustomEvent<{ href?: string }>).detail?.href;
      let toProject = false;
      if (href) {
        try {
          toProject = /^\/projects\/[^/]+$/.test(
            new URL(href, location.href).pathname,
          );
        } catch {}
      }
      const cur = metaRef.current?.projectInfo ?? null;
      if (toProject && cur) {
        setPersistInfo(cur); // infos SOURCE, affichées le temps du trou meta=null
        setHudPersist(true); // le calque persistant (z-90) prend le relais
      }
      armDecode.current = true; // un changement/ouverture de projet va suivre → Matrix OK
      prepMain();
      const soft = pathRef.current === "/contact"; // Contact = contenu manuscrit
      const mainNodes = mainText();
      const frameNodes = frameText();
      setNowrap([...mainNodes, ...frameNodes], true);
      const tl = gsap.timeline();
      exitTl = tl;
      tl.timeScale(speedRef.current); // vitesse globale (réglage back-office)
      const c = { v: 0 };
      // DÉZOOM lesté (pull-back caméra), même courbe que la navbar (Phase A).
      tl.to(
        c,
        { v: 1, duration: 0.72, ease: "power3.inOut", onUpdate: () => setFrame(c.v) },
        0,
      );
      // (les icônes sociales NE disparaissent plus : présentes toute l'animation)
      const p = { s: 0 };
      // SORTIE : le CADRE reste TOUJOURS en Matrix (jamais vidé) ; seul le CONTENU
      // de page Contact s'EFFACE (manuscrit).
      tl.to(
        p,
        {
          s: 1,
          duration: 1.1,
          ease: "none",
          onUpdate: () => {
            mainNodes.forEach((f) => (soft ? eraseNode(f, p.s) : scrambleNode(f)));
            frameNodes.forEach((f) => scrambleNode(f));
          },
        },
        0,
      );
    };

    // ENTRÉE : le cadre se rouvre, le contenu revient + tout le texte se ré-écrit.
    const onEnter = () => {
      prepMain(); // nettoie <main> + calcule l'origine = centre écran
      setFrame(1); // on part fermé/effacé
      const tl = gsap.timeline({
        onComplete: () => {
          pageZoom.value = 1; // la galerie se déclippe d'elle-même (z ≈ 1)
          const main = document.querySelector<HTMLElement>("main");
          if (main) gsap.set(main, { clearProps: "transform,transformOrigin" });
          corners().forEach((el) => gsap.set(el, { clearProps: "transform" }));
          if (innerRef.current)
            gsap.set(innerRef.current, {
              clearProps: "top,left,right,bottom,opacity,visibility",
            });
          // Transition finie → le calque persistant rend la main au HUD du cadre
          // (qui affiche désormais le nouveau projet, déjà décodé).
          setHudPersist(false);
        },
      });
      tl.timeScale(speedRef.current); // vitesse globale (réglage back-office)
      const c = { v: 1 };
      // MAINTIEN dézoomé pendant que la navbar QUITTE le 1er cadre (~0.78 s), PUIS
      // rezoom synchro + ATTERRISSAGE doux (`power3.out`), plus long qu'avant pour
      // qu'on voie mieux la navbar/page se remettre en place.
      tl.to(
        c,
        { v: 0, duration: 1.5, ease: "power3.out", onUpdate: () => setFrame(c.v) },
        0.78,
      );

      runDecode(); // le texte se ré-écrit (décryptage gauche→droite)
    };

    // RÉVÉLATION PROJET : la galerie remplit déjà le petit cadre (zoomée sur sa 1re
    // photo, clippée). On REOUVRE le cadre (COSMÉTIQUE seulement → pas de pageZoom : la
    // galerie pilote son propre dézoom) ET on décode le texte (sinon il reste brouillé).
    // Timings accordés avec project-transition (palier 0.78 puis 1.5, power3.out).
    const onProjectReveal = () => {
      if (exitTl) exitTl.kill(); // stoppe le dézoom de sortie (sinon il réécrit pageZoom)
      exitTl = null;
      armDecode.current = true; // ouverture depuis le cinéma → le HUD du projet se décode
      // Le « cadre » est désormais porté par le clip au SLOT de la 1re photo (cf.
      // project-transition) → on EFFACE rapidement le cadre central (1er cadre + repères
      // caméra) pour ne pas avoir deux cadres concurrents, et on décode le texte.
      const tl = gsap.timeline({
        onComplete: () => {
          corners().forEach((el) => gsap.set(el, { clearProps: "transform" }));
          if (innerRef.current)
            gsap.set(innerRef.current, {
              clearProps: "top,left,right,bottom,opacity,visibility",
            });
        },
      });
      tl.timeScale(getProjectSpeed()); // vitesse de l'OUVERTURE PROJET (synchro galerie)
      const c = { v: 1 };
      tl.to(
        c,
        { v: 0, duration: 0.35, ease: "power2.out", onUpdate: () => setFrame(c.v, true) },
        0,
      );
      runDecode(); // le texte du cadre se ré-écrit (plus de Matrix figé)
    };

    window.addEventListener("ac:page-exit", onExit);
    window.addEventListener("ac:page-enter", onEnter);
    window.addEventListener("ac:project-reveal", onProjectReveal);
    return () => {
      window.removeEventListener("ac:page-exit", onExit);
      window.removeEventListener("ac:page-enter", onEnter);
      window.removeEventListener("ac:project-reveal", onProjectReveal);
    };
  }, []);

  const links = (socials ?? []).filter((s) => isSocialPlatform(s.platform) && s.url);

  // HUD projet : un SEUL des deux est monté à la fois (ils portent tous deux `hudRef`).
  //  • persist (projet → projet) → calque z-90 qui survit au trou meta=null, alimenté par
  //    le meta courant OU, pendant le trou, par `persistInfo` (infos de la source).
  //  • sinon → HUD DANS le cadre (z-30), qui part avec lui pendant la transition.
  const overlayInfo = hudPersist ? (meta?.projectInfo ?? persistInfo) : null;
  const frameInfo = !hudPersist ? (meta?.projectInfo ?? null) : null;

  return (
    <>
      {/* Calque persistant — HORS cadre, AU-DESSUS du voile navbar (z-[90] > pilule
          z-80) : projet → projet, les infos restent visibles toute l'animation puis se
          décodent (Matrix) vers le nouveau projet. `mix-blend-difference` → lisible sur
          le voile blanc comme sur une photo. */}
      {overlayInfo && (
        <div
          ref={hudRef}
          data-frame-hud
          className="pointer-events-none fixed right-5 top-1/2 z-[90] hidden -translate-y-1/2 select-none flex-col items-end gap-5 text-right font-mono font-bold uppercase text-white mix-blend-difference md:right-8 md:flex"
        >
          <HudInner info={overlayInfo} />
        </div>
      )}

      {meta && (
        <div
          ref={rootRef}
          data-site-frame
          className="pointer-events-none fixed inset-0 z-30 select-none font-mono font-bold uppercase text-white mix-blend-difference"
        >
      {/* 1er cadre (apparaît autour de la page dézoomée pendant la transition) */}
      <div
        ref={innerRef}
        aria-hidden
        data-frame-mark
        className="invisible absolute inset-0 rounded-[2px] border border-white/80 opacity-0"
      />

      <span
        ref={tlc}
        data-frame-mark
        className="absolute left-5 top-24 size-4 border-l border-t border-white md:left-8 md:top-14"
      />
      <span
        ref={trc}
        data-frame-mark
        className="absolute right-5 top-24 size-4 border-r border-t border-white md:right-8 md:top-14"
      />
      <span
        ref={blc}
        data-frame-mark
        className="absolute bottom-12 left-5 size-4 border-b border-l border-white md:bottom-14 md:left-8"
      />
      <span
        ref={brc}
        data-frame-mark
        className="absolute bottom-12 right-5 size-4 border-b border-r border-white md:bottom-14 md:right-8"
      />

      <div className="absolute left-5 top-[4.5rem] text-[11px] tracking-[0.14em] md:left-8 md:top-5 md:text-xs">
        {meta.title}
      </div>

      {typeof meta.count === "number" && meta.count > 0 && (
        <div className="absolute right-5 top-[4.5rem] text-right text-[11px] tracking-[0.14em] tabular-nums md:right-8 md:top-5 md:text-xs">
          {typeof meta.current === "number" ? (
            `(${pad2(meta.current)} / ${pad2(meta.count)})`
          ) : (
            <>
              <span className="opacity-60">{meta.unit ?? "Photos"} </span>
              <span>({pad3(meta.count)})</span>
            </>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-5 hidden items-center text-[11px] tracking-[0.14em] md:left-8 md:flex md:text-xs">
        <span>
          ©{year}&nbsp;{domain()}
        </span>
      </div>

      {/* HUD projet DANS le cadre (z-30) — cas normal : il part avec le cadre pendant
          la transition (sauf projet → projet, où c'est le calque persistant qui prend
          le relais, cf. `hudPersist`). */}
      {frameInfo && (
        <div
          ref={hudRef}
          data-frame-hud
          className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-5 text-right md:right-8 md:flex"
        >
          <HudInner info={frameInfo} />
        </div>
      )}

      {/* Navigation projet — fait partie du cadre (préc. / position / suiv.). */}
      {meta.nav && (
        <div className="absolute bottom-4 left-1/2 flex max-w-[78vw] -translate-x-1/2 items-center gap-3 text-[11px] tracking-[0.14em] md:text-xs">
          {meta.nav.prevSlug ? (
            <Link
              href={`/projects/${meta.nav.prevSlug}`}
              data-page-transition
              data-page-label={meta.nav.prevTitle ?? undefined}
              aria-label={`Projet précédent : ${meta.nav.prevTitle ?? ""}`}
              className="pointer-events-auto flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-60"
            >
              <span className="shrink-0">←</span>
              <span className="truncate">{meta.nav.prevTitle}</span>
            </Link>
          ) : (
            <span className="opacity-0">←</span>
          )}
          <span className="shrink-0 tabular-nums opacity-80">
            {meta.nav.prevNum != null && meta.nav.nextNum != null
              ? `${pad2(meta.nav.prevNum)} / ${pad2(meta.nav.nextNum)}`
              : `${pad2(meta.nav.index)} / ${pad2(meta.nav.total)}`}
          </span>
          {meta.nav.nextSlug ? (
            <Link
              href={`/projects/${meta.nav.nextSlug}`}
              data-page-transition
              data-page-label={meta.nav.nextTitle ?? undefined}
              aria-label={`Projet suivant : ${meta.nav.nextTitle ?? ""}`}
              className="pointer-events-auto flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-60"
            >
              <span className="truncate">{meta.nav.nextTitle}</span>
              <span className="shrink-0">→</span>
            </Link>
          ) : (
            <span className="opacity-0">→</span>
          )}
        </div>
      )}

      {links.length > 0 && (
        <div className="pointer-events-auto absolute left-5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4 md:left-8">
          {links.map((s) => {
            const Icon = SOCIAL_ICONS[s.platform as keyof typeof SOCIAL_ICONS];
            return (
              <a
                key={s.platform + s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL_META[s.platform as keyof typeof SOCIAL_META]?.label}
                className="transition-opacity hover:opacity-60"
              >
                <Icon className="size-[15px] md:size-4" />
              </a>
            );
          })}
        </div>
      )}

      <Link
        href="/mentions-legales"
        className="pointer-events-auto absolute bottom-28 right-4 [writing-mode:vertical-rl] rotate-180 text-[10px] tracking-[0.2em] opacity-25 transition-opacity hover:opacity-100 md:right-7"
      >
        Mentions légales
      </Link>

      {email && (
        <button
          type="button"
          onClick={copyEmail}
          aria-label={`Copier l'adresse email ${email}`}
          className="pointer-events-auto absolute bottom-4 right-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-60 md:right-8 md:text-xs"
        >
          {copied ? "Copié !" : email}
        </button>
      )}
        </div>
      )}
    </>
  );
}
