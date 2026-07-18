/**
 * Registre du « propriétaire » du scroll : les composants qui instancient leur
 * propre Lenis (galerie WebGL, cinémas) se déclarent ici pour que le lissage
 * global (SmoothScroll) se retire — jamais deux Lenis sur le même document.
 */
let owners = 0;
const subs = new Set<() => void>();

/** À appeler quand un composant crée son Lenis ; renvoie la fonction de libération. */
export function claimScroll(): () => void {
  owners++;
  subs.forEach((f) => f());
  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners--;
    subs.forEach((f) => f());
  };
}

export function hasScrollOwner(): boolean {
  return owners > 0;
}

export function onScrollOwnersChange(f: () => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}
