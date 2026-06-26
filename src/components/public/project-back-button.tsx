"use client";

import Link from "next/link";

/**
 * Bouton « Retour » sur la page projet, rendu DANS le cadre (haut-gauche, vertical).
 * Texte écrit de BAS EN HAUT (`writing-mode: vertical-rl` + `rotate-180`) avec la
 * flèche vers le HAUT — il indique la sortie « vers le haut » du projet.
 *
 * Rendu comme un lien interne classique → l'intercepteur de la navbar joue la
 * TRANSITION DE PAGE STANDARD (la destination cinéma n'est pas une page projet).
 * Transitions désactivées dans les réglages → l'intercepteur se retire, navigation
 * normale.
 */
export function ProjectBackButton({ cinemaUrl }: { cinemaUrl: string }) {
  return (
    <Link
      href={cinemaUrl}
      aria-label="Retour aux projets"
      // MARGES de « Mentions légales » (left-4 / md:left-7), mais COULEUR + TAILLE des
      // autres infos du cadre : blanc plein (mix-blend-difference), text-[11px]/md:text-xs,
      // tracking 0.14em, pleine opacité (voyant) → hover 60 % comme les liens du cadre.
      // Vertical, lu de bas en haut, flèche ↑ centrée au-dessus.
      className="pointer-events-auto fixed left-4 top-28 z-40 flex flex-col items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white mix-blend-difference transition-opacity hover:opacity-60 md:left-7 md:text-xs"
    >
      <span aria-hidden className="text-sm leading-none">
        ↑
      </span>
      <span className="[writing-mode:vertical-rl] rotate-180 leading-none">
        Retour
      </span>
    </Link>
  );
}
