/**
 * Réglages des animations du site, éditables dans le back-office.
 * Aucune dépendance serveur → importable côté client (composants) et serveur.
 * `intensity` est un pourcentage : 100 = réglage par défaut, 0 = nul, 200 = double.
 */
export type AnimationSettings = {
  cursorEnabled: boolean;
  cursorIntensity: number;
  /** Survol « flottement » : la surface de la photo se déforme et suit la souris.
   *  EXCLUSIF avec photoDim (un seul effet de survol à la fois). */
  photoHoverEnabled: boolean;
  photoHoverIntensity: number;
  /** Survol « mise en avant » : la photo survolée reste nette, les autres
   *  s'estompent. EXCLUSIF avec photoHover. */
  photoDimEnabled: boolean;
  photoDimIntensity: number;
  scrollWaveEnabled: boolean;
  scrollWaveIntensity: number;
  /** Défilement infini des galeries (boucle transparente). Pas d'intensité. */
  infiniteScrollEnabled: boolean;
  /** Transition de page (dézoom caméra + navbar/cadre + Matrix). Pas d'intensité. */
  pageTransitionEnabled: boolean;
  /** Vitesse de la transition de page. « medium » = réglage validé par défaut. */
  pageTransitionSpeed: "slow" | "medium" | "fast";
  /** Animation de démarrage (loader : écran blanc → titre → cadre → arrivée). */
  loaderEnabled: boolean;
  /** Vitesse du loader (mêmes paliers que la transition de page). */
  loaderSpeed: "slow" | "medium" | "fast";
  /** Ouverture d'un projet (le petit cadre s'ouvre sur la galerie depuis la 1re photo). */
  projectTransitionEnabled: boolean;
  /** Vitesse de l'ouverture de projet (mêmes paliers). */
  projectTransitionSpeed: "slow" | "medium" | "fast";
};

/** Facteur `timeScale` GSAP appliqué à TOUTE la transition (durées + décalages +
 *  maintiens d'un coup → reste parfaitement synchro). >1 = plus rapide. */
export const TRANSITION_SPEED_FACTOR: Record<
  AnimationSettings["pageTransitionSpeed"],
  number
> = {
  slow: 0.72,
  medium: 1,
  fast: 1.4,
};

export const DEFAULT_ANIMATIONS: AnimationSettings = {
  cursorEnabled: true,
  cursorIntensity: 100,
  // Par défaut : mise en avant (photoDim) active, flottement désactivé.
  photoHoverEnabled: false,
  photoHoverIntensity: 100,
  photoDimEnabled: true,
  photoDimIntensity: 100,
  scrollWaveEnabled: true,
  scrollWaveIntensity: 100,
  infiniteScrollEnabled: true,
  pageTransitionEnabled: true,
  pageTransitionSpeed: "medium",
  loaderEnabled: true,
  loaderSpeed: "medium",
  projectTransitionEnabled: true,
  projectTransitionSpeed: "medium",
};

/** Complète d'éventuels champs manquants avec les valeurs par défaut. */
export function resolveAnimations(
  a?: Partial<AnimationSettings> | null,
): AnimationSettings {
  const out = { ...DEFAULT_ANIMATIONS, ...(a ?? {}) };
  // Les deux effets de survol sont exclusifs. Si un réglage enregistré avant
  // l'arrivée de la « mise en avant » a encore les deux actifs, elle gagne
  // (c'est le comportement en place sur le site).
  if (out.photoDimEnabled && out.photoHoverEnabled) out.photoHoverEnabled = false;
  return out;
}

/**
 * Effets à intensité réglable (curseur, survol, défilement) affichés dans l'admin
 * avec un libellé et une courte explication, plus un aperçu live.
 */
export const ANIMATION_INFO = [
  {
    key: "cursor",
    label: "Curseur fumée",
    help: "Un halo de fumée suit la souris et inverse les couleurs sous lui. Bien visible sur la page Contact, très discret ailleurs.",
  },
  {
    key: "photoDim",
    label: "Survol : mise en avant",
    help: "Au survol d'une photo de galerie, elle reste nette pendant que toutes les autres s'estompent doucement. L'intensité règle la force de l'estompage. Activer cet effet désactive le flottement.",
  },
  {
    key: "photoHover",
    label: "Survol : flottement",
    help: "Au survol d'une photo de galerie, sa surface se déforme légèrement et suit la souris, comme une matière vivante. Activer cet effet désactive la mise en avant.",
  },
  {
    key: "scrollWave",
    label: "Vague au défilement",
    help: "Pendant le défilement d'une galerie, les photos ondulent doucement en passant au centre de l'écran.",
  },
] as const;
