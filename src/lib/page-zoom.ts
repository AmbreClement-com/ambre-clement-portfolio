/**
 * Niveau de zoom de la page (1 = normal, < 1 = dézoomé), PARTAGÉ entre :
 *  - `SiteFrame` qui l'ANIME pendant la transition de page (events navbar) ;
 *  - la galerie WebGL (`photos-scroller`) qui le LIT dans sa boucle de rendu et
 *    l'applique via le shader (`gl_Position.xy *= uZoom`) → vrai dézoom des
 *    photos SANS scaler le DOM (un transform casserait curtains.js).
 *
 * Objet mutable simple (pas de state React) : lecture haute fréquence côté rendu.
 */
export const pageZoom = { value: 1 };

/**
 * Décalage (PAN) du zoom de la galerie, en clip space (NDC, [-1..1], y vers le haut),
 * appliqué APRÈS le zoom : `gl_Position.xy = xy * uZoom + uOffset`.
 *  - [0,0] = pas de pan → comportement par défaut (transition de page inchangée) ;
 *  - ≠ [0,0] = la galerie est recadrée (ouverture projet : 1re photo amenée au centre
 *    du petit cadre, puis ramenée à sa case quand `uOffset` revient à [0,0]).
 * IMPORTANT : toujours remettre [0,0] en fin d'animation (sinon transition cassée).
 */
export const pageOffset = { value: [0, 0] as [number, number] };

/**
 * Échelle minimale de la page au plus fort du dézoom (0.2 = 20 %). Partagée pour
 * que la navbar sache où se trouve le « 1er cadre » (rectangle central de la page
 * dézoomée) et y borne son animation. Le cadre intérieur = centre, taille
 * `MIN_ZOOM × viewport`, inset `(1 - MIN_ZOOM) / 2`.
 */
export const MIN_ZOOM = 0.2;
