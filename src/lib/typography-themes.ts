/**
 * Registre des THÈMES TYPOGRAPHIQUES du site public — données pures (importables
 * partout : actions serveur, schéma, UI) ; les polices `next/font` correspondantes
 * vivent dans `typography-fonts.ts` (auto-hébergées → RGPD + Web Vitals, l'URL
 * `googleCss` n'est donnée qu'à titre de référence/extension).
 *
 * Chaque thème est pensé comme un SYSTÈME : une voix pour les titres, une pour le
 * texte courant — appliquées à TOUT le site public, éléments mono compris (cadre,
 * HUD, compteurs). Seul le thème « Brutaliste » conserve son Space Mono d'origine.
 */

export type TypographyTheme = {
  id: string;
  name: string;
  /** Police des titres (nom lisible). */
  heading: string;
  /** Police du texte courant. */
  body: string;
  /** L'ambiance, en une phrase. */
  description: string;
  /** Pourquoi la combinaison fonctionne. */
  why: string;
  /** Import Google Fonts équivalent (référence — le site auto-héberge via next/font). */
  googleCss: string;
};

const g = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f}`)
    .join("&")}&display=swap`;

export const DEFAULT_TYPOGRAPHY = "signature";

export const TYPOGRAPHY_THEMES: TypographyTheme[] = [
  {
    id: "signature",
    name: "Signature — Défaut",
    heading: "Figtree",
    body: "Jost",
    description:
      "La référence maquette : titres nets et aériens, texte géométrique léger — équivalents libres de Proxima Nova (Figtree) et Futura PT (Jost).",
    why: "Figtree a le dessin doux et contemporain de Proxima Nova ; Jost porte l'esprit Futura — le duo des portfolios photo épurés, en 100 % open source.",
    googleCss: g(["Figtree:wght@300;400;600", "Jost:wght@300;400;600"]),
  },
  {
    id: "brut",
    name: "Brutaliste",
    heading: "Space Grotesk",
    body: "Space Grotesk",
    description: "L'ancien caractère du site : grotesque affirmée, brute et graphique.",
    why: "Une seule voix géométrique du titre au texte : radical, cohérent, photographique.",
    googleCss: g(["Space+Grotesk:wght@400;700"]),
  },
  {
    id: "suisse",
    name: "Suisse",
    heading: "Inter",
    body: "Inter",
    description: "Style international : neutralité absolue, grilles, précision helvétique.",
    why: "Une néo-grotesque unique laisse toute la place aux images — l'école suisse en un choix.",
    googleCss: g(["Inter:wght@400;600"]),
  },
  {
    id: "editorial",
    name: "Éditorial",
    heading: "Playfair Display",
    body: "Source Serif 4",
    description: "Grand journal du dimanche : didone contrastée, texte serif confortable.",
    why: "Le contraste dramatique de Playfair attire l'œil, Source Serif assure des paragraphes lisibles.",
    googleCss: g(["Playfair+Display:wght@400;700", "Source+Serif+4:wght@400;600"]),
  },
  {
    id: "luxe",
    name: "Luxe",
    heading: "Cormorant Garamond",
    body: "Jost",
    description: "Maison de couture : garalde délicate sur géométrique discrète.",
    why: "Serif fine = raffinement ; Jost (esprit Futura) apporte une modernité silencieuse au texte.",
    googleCss: g(["Cormorant+Garamond:wght@400;600", "Jost:wght@400;600"]),
  },
  {
    id: "minimal",
    name: "Minimaliste",
    heading: "Manrope",
    body: "Manrope",
    description: "Rien d'autre que l'essentiel : une sans douce, des espaces, du calme.",
    why: "Manrope est neutre mais chaleureuse — une seule famille, zéro friction visuelle.",
    googleCss: g(["Manrope:wght@400;700"]),
  },
  {
    id: "sobre",
    name: "Sobre — esprit Apple",
    heading: "Inter Tight",
    body: "Inter",
    description: "Produit premium : titres resserrés, texte limpide, tout est évident.",
    why: "Inter Tight condense les titres comme SF Display ; Inter reste la référence de lisibilité écran.",
    googleCss: g(["Inter+Tight:wght@400;600", "Inter:wght@400;600"]),
  },
  {
    id: "magazine",
    name: "Magazine",
    heading: "Fraunces",
    body: "Libre Franklin",
    description: "Presse indépendante : serif expressive à personnalité, texte journalistique.",
    why: "Fraunces a du croustillant (soft-serif old style), Franklin est l'ADN de la presse américaine.",
    googleCss: g(["Fraunces:wght@400;600", "Libre+Franklin:wght@400;600"]),
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    heading: "Jost",
    body: "Jost",
    description: "Géométrie pure années 20 : cercles, angles, fonctionnalisme joyeux.",
    why: "Jost est dessinée d'après Futura, la police du Bauhaus — une seule famille, un manifeste.",
    googleCss: g(["Jost:wght@400;600"]),
  },
  {
    id: "elegant",
    name: "Élégant",
    heading: "Italiana",
    body: "Karla",
    description: "Calligraphie contemporaine : titres effilés comme une signature.",
    why: "Italiana (une seule graisse, très haute) est faite pour les grands titres photo ; Karla reste humble.",
    googleCss: g(["Italiana", "Karla:wght@400;600"]),
  },
  {
    id: "fashion",
    name: "Fashion",
    heading: "Bodoni Moda",
    body: "Montserrat",
    description: "Couverture de Vogue : didone ultra-contrastée, texte capitale de mode.",
    why: "Bodoni EST la mode depuis deux siècles ; Montserrat, géométrique urbaine, la modernise.",
    googleCss: g(["Bodoni+Moda:wght@400;700", "Montserrat:wght@400;600"]),
  },
  {
    id: "galerie",
    name: "Art Gallery",
    heading: "Spectral",
    body: "Work Sans",
    description: "Catalogue d'exposition : serif d'écran cultivée, sans discrète.",
    why: "Spectral a été dessinée pour la lecture d'art en ligne ; Work Sans s'efface devant les œuvres.",
    googleCss: g(["Spectral:wght@400;600", "Work+Sans:wght@400;600"]),
  },
  {
    id: "architecture",
    name: "Architecture",
    heading: "Archivo",
    body: "Archivo",
    description: "Béton et lumière : grotesque solide, structurée, sans ornement.",
    why: "Une seule famille robuste = rigueur constructive ; les graisses font la hiérarchie, pas les styles.",
    googleCss: g(["Archivo:wght@400;700"]),
  },
  {
    id: "cinema",
    name: "Cinéma",
    heading: "Bebas Neue",
    body: "Source Sans 3",
    description: "Affiche de film : capitales condensées monumentales, texte de générique.",
    why: "Bebas donne l'échelle d'un titre de film ; Source Sans, sobre, joue le générique lisible.",
    googleCss: g(["Bebas+Neue", "Source+Sans+3:wght@400;600"]),
  },
  {
    id: "retro",
    name: "Rétro",
    heading: "Abril Fatface",
    body: "Poppins",
    description: "Seventies chic : didone grasse à l'ancienne, corps géométrique rond.",
    why: "Abril évoque les affiches vintage ; Poppins la ramène dans le présent sans la trahir.",
    googleCss: g(["Abril+Fatface", "Poppins:wght@400;600"]),
  },
  {
    id: "archive",
    name: "Archive",
    heading: "IBM Plex Mono",
    body: "IBM Plex Mono",
    description: "Planche-contact : chasse fixe documentaire, esprit tirage argentique et légendes tapées.",
    why: "Le mono évoque l'archive photographique — négatifs numérotés, dos de tirages, inventaire d'atelier.",
    googleCss: g(["IBM+Plex+Mono:wght@400;600"]),
  },
  {
    id: "japonais",
    name: "Japonais minimal",
    heading: "Zen Kaku Gothic New",
    body: "Zen Kaku Gothic New",
    description: "Ma (間) : espace négatif, gothique douce, sérénité absolue.",
    why: "Dessinée au Japon, ses formes calmes et ouvertes portent l'esthétique du vide habité.",
    googleCss: g(["Zen+Kaku+Gothic+New:wght@400;700"]),
  },
  {
    id: "scandinave",
    name: "Scandinave",
    heading: "Josefin Sans",
    body: "Mulish",
    description: "Hygge géométrique : titres élancés vintage-nordique, texte clair.",
    why: "Josefin (géométrique 1920 revisitée) a la grâce nordique ; Mulish garde l'ensemble aéré.",
    googleCss: g(["Josefin+Sans:wght@400;600", "Mulish:wght@400;600"]),
  },
  {
    id: "premium",
    name: "Premium",
    heading: "Marcellus",
    body: "Figtree",
    description: "Hôtellerie cinq étoiles : capitales romaines gravées, texte moelleux.",
    why: "Marcellus (inspirée des inscriptions Trajanes) impose la distinction ; Figtree la rend accessible.",
    googleCss: g(["Marcellus", "Figtree:wght@400;600"]),
  },
  {
    id: "moderne",
    name: "Moderne",
    heading: "Sora",
    body: "Inter",
    description: "Contemporain affirmé : titres techno-géométriques, corps irréprochable.",
    why: "Sora a une signature (angles coupés) sans excentricité ; Inter équilibre l'ensemble.",
    googleCss: g(["Sora:wght@400;600", "Inter:wght@400;600"]),
  },
  {
    id: "creatif",
    name: "Créatif",
    heading: "Unbounded",
    body: "Karla",
    description: "Studio audacieux : display extra-large excentrique, texte simple.",
    why: "Unbounded assume l'extravagance en grand corps ; Karla, quasi invisible, laisse respirer.",
    googleCss: g(["Unbounded:wght@400;700", "Karla:wght@400;600"]),
  },
  {
    id: "chaleureux",
    name: "Chaleureux",
    heading: "Lora",
    body: "Assistant",
    description: "Récit intime : serif calligraphique douce, texte rond et amical.",
    why: "Lora a le grain d'une plume ; Assistant apporte l'air et la simplicité du quotidien.",
    googleCss: g(["Lora:wght@400;600", "Assistant:wght@400;600"]),
  },
  {
    id: "geometrique",
    name: "Géométrique",
    heading: "Poppins",
    body: "Poppins",
    description: "Cercles parfaits : géométrique pure, franche et optimiste.",
    why: "Poppins en solo est immédiatement reconnaissable — rondeur rigoureuse, hiérarchie par graisse.",
    googleCss: g(["Poppins:wght@400;600"]),
  },
  {
    id: "classique",
    name: "Classique",
    heading: "EB Garamond",
    body: "EB Garamond",
    description: "Bibliothèque ancienne : le Garamond, cinq siècles d'autorité tranquille.",
    why: "Un seul Garamond du titre au texte = l'élégance de l'édition traditionnelle, intemporelle.",
    googleCss: g(["EB+Garamond:wght@400;600"]),
  },
  {
    id: "parisien",
    name: "Parisien",
    heading: "DM Serif Display",
    body: "DM Sans",
    description: "Rive gauche : didone charmeuse à l'œil vif, sans géométrique complice.",
    why: "Les deux DM sont dessinées pour cohabiter — contraste serif/sans net mais jamais discordant.",
    googleCss: g(["DM+Serif+Display", "DM+Sans:wght@400;600"]),
  },
  {
    id: "neogrotesque",
    name: "Néo-grotesque",
    heading: "Hanken Grotesk",
    body: "Hanken Grotesk",
    description: "Grotesque du moment : humaniste discrète, actuelle, très digeste.",
    why: "Hanken est la synthèse contemporaine — chaleur d'une humaniste, tenue d'une grotesque.",
    googleCss: g(["Hanken+Grotesk:wght@400;700"]),
  },
  {
    id: "studio",
    name: "Studio",
    heading: "Syne",
    body: "Space Grotesk",
    description: "Agence d'art : display large aux formes inattendues sur la grotesque maison.",
    why: "Syne (dessinée pour un centre d'art) surprend en titre ; Space Grotesk garde l'ADN du site.",
    googleCss: g(["Syne:wght@400;700", "Space+Grotesk:wght@400;700"]),
  },
  {
    id: "litteraire",
    name: "Littéraire",
    heading: "Crimson Pro",
    body: "Crimson Pro",
    description: "Roman à l'ancienne : serif de labeur douce pensée pour les longues pages.",
    why: "Crimson est faite pour lire longtemps — un portfolio qui se raconte comme un livre.",
    googleCss: g(["Crimson+Pro:wght@400;600"]),
  },
  {
    id: "iconique",
    name: "Iconique",
    heading: "Prata",
    body: "Inter",
    description: "Portrait de studio : didone calme et précieuse, socle neutre parfait.",
    why: "Prata (une graisse unique, superbe en grand) magnifie les noms propres ; Inter s'efface.",
    googleCss: g(["Prata", "Inter:wght@400;600"]),
  },
];

const TYPOGRAPHY_IDS = TYPOGRAPHY_THEMES.map((t) => t.id);

export function isTypographyId(v: unknown): v is string {
  return typeof v === "string" && TYPOGRAPHY_IDS.includes(v);
}

