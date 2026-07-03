"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MIN_ZOOM } from "@/lib/page-zoom";

// L'effet Matrix sur les LETTRES a été retiré : seuls les CHIFFRES « roulent ».
const DIGITS = "0123456789";
const rnd = () => DIGITS[(Math.random() * DIGITS.length) | 0];

/**
 * Construit `to` (depuis `from`) en MANUSCRIT : la longueur affichée interpole
 * (les caractères s'ajoutent/s'effacent) sur les ~70 % premiers, puis se fige
 * L→R dans les ~25 % finaux. Les lettres restent lisibles ; seuls les chiffres
 * roulent avant de se poser. (Même logique que le titre de la navbar.)
 */
function scrambleString(from: string, to: string, p: number): string {
  const lenFrom = from.length;
  const lenTo = to.length;
  const curLen = Math.round(lenFrom + (lenTo - lenFrom) * Math.min(1, p / 0.7));
  let out = "";
  for (let i = 0; i < curLen; i++) {
    const ch = i < lenTo ? to[i] : undefined;
    if (ch === " ") {
      out += " ";
      continue;
    }
    const frac = lenTo > 1 ? i / (lenTo - 1) : 0;
    const resolved = ch !== undefined && p >= 0.75 + 0.22 * frac;
    if (resolved) out += ch;
    else if (ch !== undefined && ch >= "0" && ch <= "9") out += rnd();
    else out += from[i] ?? ch ?? "";
  }
  return out;
}

function renderScramble(el: HTMLElement, from: string, to: string, p: number) {
  el.textContent = scrambleString(from, to, p);
}

/**
 * Variante MANUSCRITE (pour les infos du cadre) : on écrit LETTRE PAR LETTRE, de
 * gauche à droite. La longueur affichée = la position du « stylo », qui avance de 0
 * à la fin → on démarre vraiment à UNE lettre puis on grandit. Les ~1,6 lettres
 * sous le stylo se BROUILLENT (Matrix) ; derrière, le texte est figé/lisible.
 */
function handwriteScramble(to: string, p: number): string {
  const len = to.length;
  if (!len) return "";
  const band = 1.6; // nb de lettres brouillées au niveau du stylo
  const front = p * (len + band); // dépasse `len` pour laisser la dernière lettre résoudre
  let out = "";
  for (let i = 0; i < len; i++) {
    if (front <= i) break; // lettre pas encore atteinte → la longueur = le stylo
    const ch = to[i];
    if (ch === " " || ch === " ") {
      out += ch;
      continue;
    }
    // Sous le stylo : seuls les CHIFFRES roulent ; les lettres s'écrivent nettes.
    out += front - i < band && ch >= "0" && ch <= "9" ? rnd() : ch;
  }
  return out;
}

type Phase = "pending" | "play" | "done";

/**
 * Loader de démarrage (1× par session). ÉTAPE 1 : écran blanc, « AMBRE CLÉMENT »
 * s'écrit en manuscrit + Matrix, puis (placeholder) fondu vers l'accueil.
 * Les étapes suivantes ajouteront : dézoom dans le cadre, dessin du cadre, et le
 * retour (= le `reveal()` du changement de page).
 */
export function IntroOverlay({
  enabled = true,
  speed = 1,
  siteName = "Ambre Clément",
}: {
  /** Activé dans les réglages animations (sinon le site s'affiche directement). */
  enabled?: boolean;
  /** Facteur `timeScale` (réglage vitesse du loader). >1 = plus rapide. */
  speed?: number;
  /** Nom du site (réglable dans l'admin) — le titre qui s'écrit au démarrage. */
  siteName?: string;
}) {
  const LOGO = siteName.toUpperCase();
  const [phase, setPhase] = useState<Phase>("pending");
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!enabled || reduced || sessionStorage.getItem("ac-intro")) {
        setPhase("done");
        return;
      }
      sessionStorage.setItem("ac-intro", "1");
      setPhase("play");
    });
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  useEffect(() => {
    if (phase !== "play") return;
    const title = titleRef.current;
    const root = rootRef.current;
    const corners = cornersRef.current;
    const inner = innerRef.current;
    if (!title || !root) return;

    renderScramble(title, "", LOGO, 0);
    const prog = { p: 0 };
    const tl = gsap.timeline({ onComplete: () => setPhase("done") });
    tl.timeScale(speed); // vitesse du loader (réglage back-office)
    // ── ÉTAPE 1 : le titre s'écrit (manuscrit) en se brouillant (Matrix).
    tl.to(title, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0);
    tl.to(
      prog,
      {
        p: 1,
        duration: 1.5,
        ease: "none",
        onUpdate: () => renderScramble(title, "", LOGO, prog.p),
      },
      0,
    );
    // ── ÉTAPE 2 : la page (blanche) DÉZOOME dans le petit cadre — même courbe que
    //    le pull-back de la transition. Le titre rapetisse vers le centre.
    tl.to(
      title,
      { scale: MIN_ZOOM, duration: 0.72, ease: "power3.inOut" },
      "+=0.45",
    );
    // ── ÉTAPE 3a : on TRACE (comme au stylo, via stroke-dashoffset) le PETIT CADRE
    //    intérieur autour du titre dézoomé, puis les REPÈRES du 2ᵉ cadre.
    const draw = (
      path: SVGPathElement,
      d: string,
      duration: number,
      at: gsap.Position,
    ) => {
      path.setAttribute("d", d);
      const len = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: len,
        strokeDashoffset: len,
        autoAlpha: 1,
      });
      tl.to(path, { strokeDashoffset: 0, duration, ease: "power1.inOut" }, at);
    };
    {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // petit cadre = page dézoomée (MIN_ZOOM, centrée) → inset (1-z)/2.
      const m = (1 - MIN_ZOOM) / 2;
      const fl = vw * m;
      const fr = vw * (1 - m);
      const ft = vh * m;
      const fb = vh * (1 - m);
      if (inner) {
        draw(
          inner,
          `M${fl} ${ft} L${fr} ${ft} L${fr} ${fb} L${fl} ${fb} Z`,
          0.7,
          "-=0.1",
        );
      }
      // repères = 2ᵉ cadre extérieur (même inset que la transition).
      const ix = vw * 0.2 + 32;
      const iy = vh * 0.2 + 56;
      const L = 18;
      if (corners) {
        draw(
          corners,
          [
            `M${ix} ${iy + L} L${ix} ${iy} L${ix + L} ${iy}`, // haut-gauche
            `M${vw - ix - L} ${iy} L${vw - ix} ${iy} L${vw - ix} ${iy + L}`, // haut-droite
            `M${ix} ${vh - iy - L} L${ix} ${vh - iy} L${ix + L} ${vh - iy}`, // bas-gauche
            `M${vw - ix - L} ${vh - iy} L${vw - ix} ${vh - iy} L${vw - ix} ${vh - iy - L}`, // bas-droite
          ].join(" "),
          0.9,
          "-=0.4",
        );
      }
    }

    // ── ÉTAPE 3b : on CLONE le vrai cadre (mêmes textes, positions, vrais logos),
    //    on cache ses repères (on a les nôtres tracés) et on fait : les infos qui
    //    s'écrivent (manuscrit + Matrix) + les logos qui se dessinent (révélés).
    let frameClone: HTMLElement | null = null;
    const realFrame =
      document.querySelector<HTMLElement>("[data-site-frame]");
    if (realFrame) {
      const clone = realFrame.cloneNode(true) as HTMLElement;
      frameClone = clone;
      clone.removeAttribute("data-site-frame");
      clone
        .querySelectorAll<HTMLElement>("[data-frame-mark]")
        .forEach((node) => {
          node.style.display = "none";
        });
      clone
        .querySelectorAll(".pointer-events-auto")
        .forEach((node) => node.classList.remove("pointer-events-auto"));
      root.appendChild(clone);

      const logos = Array.from(clone.querySelectorAll("svg"));
      // Une info = un ÉLÉMENT feuille porteur de texte (©, email, mentions, nom,
      // compteur) → on l'écrit comme UNE chaîne, proprement de gauche à droite (pas
      // en morceaux). On écarte la colonne des logos (elle contient des <svg>).
      const infos = Array.from(clone.querySelectorAll<HTMLElement>("*"))
        .filter(
          (el) => el.childElementCount === 0 && !!(el.textContent ?? "").trim(),
        )
        .map((el) => ({ el, real: el.textContent ?? "" }));

      infos.forEach(({ el }) => {
        el.textContent = "";
      });
      gsap.set(logos, { clipPath: "inset(0 0 100% 0)", autoAlpha: 0.4 });

      tl.addLabel("frameInfo", "-=0.2");
      // Chaque info s'écrit LETTRE PAR LETTRE à sa propre cadence (durée ∝ nombre
      // de lettres → vitesse d'écriture constante), toutes en parallèle.
      infos.forEach(({ el, real }) => {
        const nchars = real.replace(/\s/g, "").length;
        const dur = Math.max(0.5, nchars * 0.085);
        const lp = { p: 0 };
        tl.to(
          lp,
          {
            p: 1,
            duration: dur,
            ease: "none",
            onUpdate: () => {
              el.textContent = handwriteScramble(real, lp.p);
            },
          },
          "frameInfo",
        );
      });
      tl.to(
        logos,
        {
          clipPath: "inset(0 0 0% 0)",
          autoAlpha: 1,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.09,
        },
        "frameInfo+=0.25",
      );
    }

    // ── ÉTAPE 4 : le RETOUR = on déclenche le VRAI reveal() (la navbar se
    //    reconstruit + la page rezoome hors du cadre, exactement comme un
    //    changement de page) et on FOND le loader (blanc + clone) par-dessus.
    //    Il DÉMARRE TÔT, peu après le début de l'écriture des infos (petit décalage
    //    fixe) — il chevauche donc largement l'écriture, pas d'attente.
    const retAt: gsap.Position = realFrame ? "frameInfo+=0.3" : "+=0.4";
    tl.call(
      () => window.dispatchEvent(new Event("ac:intro-return")),
      undefined,
      retAt,
    );
    tl.to(root, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "<+0.15");

    return () => {
      tl.kill();
      frameClone?.remove();
    };
  }, [phase, speed, LOGO]);

  if (phase === "done") return null;
  return (
    <div
      ref={rootRef}
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
    >
      {phase === "play" && (
        <>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <path
              ref={innerRef}
              fill="none"
              stroke="#171717"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0"
            />
            <path
              ref={cornersRef}
              fill="none"
              stroke="#171717"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0"
            />
          </svg>
          <div
            ref={titleRef}
            className="font-mono text-3xl font-semibold uppercase tracking-[0.2em] text-neutral-900 opacity-0 md:text-5xl"
          />
        </>
      )}
    </div>
  );
}
