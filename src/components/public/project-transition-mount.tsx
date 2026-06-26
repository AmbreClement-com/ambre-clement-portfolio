"use client";

import { useEffect, useLayoutEffect } from "react";
import { finishReveal } from "@/components/public/project-transition";

// useLayoutEffect côté client (avant le paint → on pose le focal avant le 1er rendu
// de la galerie, pas de flash), useEffect en SSR pour éviter le warning.
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * À monter sur la page de DESTINATION d'une transition projet (galerie ou cinéma).
 * Au montage : si une transition est en cours, joue le rezoom focal + l'atterrissage
 * du clone partagé sur la photo de destination. Sinon (accès direct), ne fait rien.
 */
export function ProjectTransitionMount() {
  useIso(() => {
    finishReveal();
  }, []);
  return null;
}
