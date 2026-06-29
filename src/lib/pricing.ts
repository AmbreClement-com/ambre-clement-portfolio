import type { PricingContent } from "@/server/db/schema";

/**
 * Contenu par défaut de la page Tarifs — texte d'EXEMPLE en français, à
 * personnaliser entièrement depuis l'administration. (Aucun contenu repris d'un
 * site tiers : seule la mise en page reproduit la référence demandée.)
 */
export const DEFAULT_PRICING: PricingContent = {
  published: false,
  navLabel: "Tarifs",
  title: "Photographie maternité",
  subtitle: "Grossesse, post-partum & allaitement",
  intro:
    "Présentez ici votre approche en quelques paragraphes : ce que vous aimez capturer, l'ambiance de vos séances, ce qui rend votre regard unique.\n\nCe texte est un exemple : remplacez-le par vos propres mots depuis l'administration.",
  includes: [
    "Séance d'environ 1 heure",
    "Échange préparatoire pour imaginer la séance ensemble",
    "Choix du lieu : à votre domicile ou en extérieur",
    "Galerie en ligne d'une sélection soignée de 30 à 40 images",
  ],
  price: "À partir de 335 € TTC",
  image: null,
};

/** Fusionne le contenu stocké (possiblement null/partiel) avec les valeurs par défaut. */
export function resolvePricing(
  p: PricingContent | null | undefined,
): PricingContent {
  return { ...DEFAULT_PRICING, ...(p ?? {}) };
}
