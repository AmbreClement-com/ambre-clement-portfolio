"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FrameMetaData = {
  title: string;
  count?: number | null;
  /** Libellé du compteur (ex. "Photos", "Projets"). */
  unit?: string;
  /** Si défini → compteur "courant / total" (ex. projet actif : 01 / 06). */
  current?: number | null;
  /** Navigation projet (rendue DANS le cadre) : projet préc./suiv. + position. */
  nav?: {
    index: number;
    total: number;
    prevSlug: string | null;
    nextSlug: string | null;
    prevTitle: string | null;
    nextTitle: string | null;
    /** Numéro (position) du projet précédent / suivant — affiché entre les deux. */
    prevNum: number | null;
    nextNum: number | null;
  } | null;
  /**
   * Infos du projet courant, rendues dans le cadre comme le HUD du cinéma
   * (grand numéro + Projet / Lieu / Année, à droite). Présent uniquement sur la
   * page projet → ailleurs (null) le HUD ne s'affiche pas.
   */
  projectInfo?: {
    title: string;
    location: string | null;
    year: string | null;
    index: number;
    total: number;
  } | null;
  /**
   * href du menu à mettre en SURBRILLANCE (item actif) pour la page courante, quand il
   * ne se déduit pas du pathname. Cas d'usage : une page projet (`/projects/slug`) veut
   * activer sa CATÉGORIE parente (le cinéma d'où il vient, ex. "/" ou "/mariages").
   */
  activeHref?: string | null;
  /**
   * Teinte du FOND de la page derrière la nav : "light" (pages claires/galeries)
   * ou "dark" (héros plein écran sur photo). La nav s'y adapte (texte sombre sur
   * clair, texte blanc sur sombre). Défaut : "light".
   */
  tone?: "light" | "dark";
};

type Ctx = {
  meta: FrameMetaData | null;
  setMeta: (m: FrameMetaData | null) => void;
};

const FrameContext = createContext<Ctx | null>(null);

/** Fournit au cadre global (SiteFrame) le titre + le compteur de la page courante. */
export function FrameProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<FrameMetaData | null>(null);
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrameMeta() {
  return useContext(FrameContext);
}

/**
 * À déposer dans une page pour alimenter le cadre (nom + nombre de photos).
 * Se nettoie au démontage → les pages qui n'en posent pas (ex. cinéma projets)
 * n'affichent pas le cadre global.
 */
export function FrameMeta({
  title,
  count,
  unit,
  current,
  tone,
  navIndex,
  navTotal,
  navPrev = null,
  navNext = null,
  navPrevTitle = null,
  navNextTitle = null,
  navPrevNum = null,
  navNextNum = null,
  projectTitle = null,
  projectLocation = null,
  projectYear = null,
  activeHref = null,
}: {
  title: string;
  count?: number | null;
  unit?: string;
  current?: number | null;
  tone?: "light" | "dark";
  activeHref?: string | null;
  /** Navigation projet (passée en primitives pour des deps stables). */
  navIndex?: number;
  navTotal?: number;
  navPrev?: string | null;
  navNext?: string | null;
  navPrevTitle?: string | null;
  navNextTitle?: string | null;
  navPrevNum?: number | null;
  navNextNum?: number | null;
  /** Infos projet (HUD droite, comme le cinéma) — primitives pour deps stables. */
  projectTitle?: string | null;
  projectLocation?: string | null;
  projectYear?: string | null;
}) {
  const ctx = useContext(FrameContext);
  const set = ctx?.setMeta;
  useEffect(() => {
    const nav =
      typeof navIndex === "number" && typeof navTotal === "number"
        ? {
            index: navIndex,
            total: navTotal,
            prevSlug: navPrev,
            nextSlug: navNext,
            prevTitle: navPrevTitle,
            nextTitle: navNextTitle,
            prevNum: navPrevNum,
            nextNum: navNextNum,
          }
        : null;
    const projectInfo =
      projectTitle != null
        ? {
            title: projectTitle,
            location: projectLocation,
            year: projectYear,
            index: navIndex ?? 1,
            total: navTotal ?? 1,
          }
        : null;
    set?.({ title, count, unit, current, tone, nav, projectInfo, activeHref });
    return () => set?.(null);
  }, [
    set,
    title,
    count,
    unit,
    current,
    tone,
    navIndex,
    navTotal,
    navPrev,
    navNext,
    navPrevTitle,
    navNextTitle,
    navPrevNum,
    navNextNum,
    projectTitle,
    projectLocation,
    projectYear,
    activeHref,
  ]);
  return null;
}
