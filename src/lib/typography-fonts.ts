/**
 * Polices `next/font` des thèmes typographiques — AUTO-HÉBERGÉES (RGPD + perfs :
 * aucun appel à Google au runtime, fichiers servis par Vercel avec le site).
 *
 * `preload: false` PARTOUT : seules les déclarations @font-face sont émises ; le
 * navigateur ne télécharge un fichier de police QUE si un élément affiché
 * l'utilise (thème actif sur le site, aperçus visibles dans l'admin).
 *
 * Le thème par défaut (`brut`) réutilise les variables du layout racine
 * (`--font-sans`/`--font-mono`, préchargées) → zéro coût quand rien n'est réglé.
 */
import {
  Inter,
  Inter_Tight,
  Playfair_Display,
  Source_Serif_4,
  Cormorant_Garamond,
  Jost,
  Manrope,
  Fraunces,
  Libre_Franklin,
  Italiana,
  Karla,
  Bodoni_Moda,
  Montserrat,
  Spectral,
  Work_Sans,
  Archivo,
  Bebas_Neue,
  Source_Sans_3,
  Abril_Fatface,
  Poppins,
  IBM_Plex_Mono,
  Zen_Kaku_Gothic_New,
  Josefin_Sans,
  Mulish,
  Marcellus,
  Figtree,
  Sora,
  Unbounded,
  Lora,
  Assistant,
  EB_Garamond,
  DM_Serif_Display,
  DM_Sans,
  Hanken_Grotesk,
  Syne,
  Crimson_Pro,
  Prata,
  Space_Grotesk,
} from "next/font/google";
import { DEFAULT_TYPOGRAPHY } from "@/lib/typography-themes";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-inter" });
const interTight = Inter_Tight({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-inter-tight" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-playfair" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-source-serif" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["300", "400", "500", "600", "700"], variable: "--gf-cormorant" });
const jost = Jost({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-jost" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-manrope" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-fraunces" });
const libreFranklin = Libre_Franklin({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-libre-franklin" });
const italiana = Italiana({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-italiana" });
const karla = Karla({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-karla" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-bodoni" });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-montserrat" });
const spectral = Spectral({ subsets: ["latin"], display: "swap", preload: false, weight: ["200", "300", "400", "500", "600", "700", "800"], variable: "--gf-spectral" });
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-work-sans" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-archivo" });
const bebas = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-bebas" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-source-sans" });
const abril = Abril_Fatface({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-abril" });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], variable: "--gf-poppins" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], display: "swap", preload: false, weight: ["100", "200", "300", "400", "500", "600", "700"], variable: "--gf-plex-mono" });
const zenKaku = Zen_Kaku_Gothic_New({ subsets: ["latin"], display: "swap", preload: false, weight: ["300", "400", "500", "700", "900"], variable: "--gf-zen-kaku" });
const josefin = Josefin_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-josefin" });
const mulish = Mulish({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-mulish" });
const marcellus = Marcellus({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-marcellus" });
const figtree = Figtree({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-figtree" });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-sora" });
const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-unbounded" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-lora" });
const assistant = Assistant({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-assistant" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-eb-garamond" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-dm-serif" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-dm-sans" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-hanken" });
const syne = Syne({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-syne" });
const crimson = Crimson_Pro({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-crimson" });
const prata = Prata({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--gf-prata" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--gf-space-grotesk" });

/** Une police déclarée : sa CLASSE next/font (qui POSE la variable CSS) + le NOM
 *  de cette variable (à référencer en `font-family: var(...)`). Les deux diffèrent :
 *  `font.variable` est une classe générée, pas le nom de la variable. */
type FontDecl = { className: string; cssVar: string };
const decl = (font: { variable: string }, cssVar: string): FontDecl => ({
  className: font.variable,
  cssVar,
});

const F = {
  inter: decl(inter, "--gf-inter"),
  interTight: decl(interTight, "--gf-inter-tight"),
  playfair: decl(playfair, "--gf-playfair"),
  sourceSerif: decl(sourceSerif, "--gf-source-serif"),
  cormorant: decl(cormorant, "--gf-cormorant"),
  jost: decl(jost, "--gf-jost"),
  manrope: decl(manrope, "--gf-manrope"),
  fraunces: decl(fraunces, "--gf-fraunces"),
  libreFranklin: decl(libreFranklin, "--gf-libre-franklin"),
  italiana: decl(italiana, "--gf-italiana"),
  karla: decl(karla, "--gf-karla"),
  bodoni: decl(bodoni, "--gf-bodoni"),
  montserrat: decl(montserrat, "--gf-montserrat"),
  spectral: decl(spectral, "--gf-spectral"),
  workSans: decl(workSans, "--gf-work-sans"),
  archivo: decl(archivo, "--gf-archivo"),
  bebas: decl(bebas, "--gf-bebas"),
  sourceSans: decl(sourceSans, "--gf-source-sans"),
  abril: decl(abril, "--gf-abril"),
  poppins: decl(poppins, "--gf-poppins"),
  plexMono: decl(plexMono, "--gf-plex-mono"),
  zenKaku: decl(zenKaku, "--gf-zen-kaku"),
  josefin: decl(josefin, "--gf-josefin"),
  mulish: decl(mulish, "--gf-mulish"),
  marcellus: decl(marcellus, "--gf-marcellus"),
  figtree: decl(figtree, "--gf-figtree"),
  sora: decl(sora, "--gf-sora"),
  unbounded: decl(unbounded, "--gf-unbounded"),
  lora: decl(lora, "--gf-lora"),
  assistant: decl(assistant, "--gf-assistant"),
  ebGaramond: decl(ebGaramond, "--gf-eb-garamond"),
  dmSerif: decl(dmSerif, "--gf-dm-serif"),
  dmSans: decl(dmSans, "--gf-dm-sans"),
  hanken: decl(hanken, "--gf-hanken"),
  syne: decl(syne, "--gf-syne"),
  crimson: decl(crimson, "--gf-crimson"),
  prata: decl(prata, "--gf-prata"),
  spaceGrotesk: decl(spaceGrotesk, "--gf-space-grotesk"),
} satisfies Record<string, FontDecl>;

export type FontPair = {
  /** Classes next/font à poser sur le wrapper (déclarent les variables). */
  className: string;
  /** Variables CSS à référencer pour titres / texte. */
  headingVar: string;
  bodyVar: string;
  /** Police des éléments `font-mono` (cadre, HUD, compteurs, logo navbar).
   *  Par défaut la police de TITRES du thème — c'est elle qui porte la
   *  personnalité, et ces éléments en capitales espacées la rendent visible.
   *  Le thème « Brutaliste » la fixe à Space Mono (look historique). */
  monoVar: string;
};

function pair(heading: FontDecl, body: FontDecl): FontPair {
  return {
    className:
      heading.className === body.className
        ? heading.className
        : `${heading.className} ${body.className}`,
    headingVar: heading.cssVar,
    bodyVar: body.cssVar,
    monoVar: heading.cssVar, // cadre/HUD/logo : la police de TITRES (personnalité visible)
  };
}

/** id de thème → paire de polices. Doit couvrir TOUS les ids de typography-themes. */
export const TYPOGRAPHY_FONTS: Record<string, FontPair> = {
  // Défaut « Signature » : équivalents libres de la maquette (Proxima→Figtree,
  // Futura PT→Jost). Titres nets, texte géométrique léger.
  signature: pair(F.figtree, F.jost),
  brut: {
    // Réutilise les polices du layout racine (déjà chargées + préchargées) et
    // GARDE le Space Mono historique sur le cadre/HUD (son identité d'origine).
    className: "",
    headingVar: "--font-sans",
    bodyVar: "--font-sans",
    monoVar: "--font-mono",
  },
  suisse: pair(F.inter, F.inter),
  editorial: pair(F.playfair, F.sourceSerif),
  luxe: pair(F.cormorant, F.jost),
  minimal: pair(F.manrope, F.manrope),
  sobre: pair(F.interTight, F.inter),
  magazine: pair(F.fraunces, F.libreFranklin),
  bauhaus: pair(F.jost, F.jost),
  elegant: pair(F.italiana, F.karla),
  fashion: pair(F.bodoni, F.montserrat),
  galerie: pair(F.spectral, F.workSans),
  architecture: pair(F.archivo, F.archivo),
  cinema: pair(F.bebas, F.sourceSans),
  retro: pair(F.abril, F.poppins),
  archive: pair(F.plexMono, F.plexMono),
  japonais: pair(F.zenKaku, F.zenKaku),
  scandinave: pair(F.josefin, F.mulish),
  premium: pair(F.marcellus, F.figtree),
  moderne: pair(F.sora, F.inter),
  creatif: pair(F.unbounded, F.karla),
  chaleureux: pair(F.lora, F.assistant),
  geometrique: pair(F.poppins, F.poppins),
  classique: pair(F.ebGaramond, F.ebGaramond),
  parisien: pair(F.dmSerif, F.dmSans),
  neogrotesque: pair(F.hanken, F.hanken),
  studio: pair(F.syne, F.spaceGrotesk),
  litteraire: pair(F.crimson, F.crimson),
  iconique: pair(F.prata, F.inter),
};

export function getTypographyFonts(id: string | null | undefined): FontPair {
  return (
    TYPOGRAPHY_FONTS[id ?? DEFAULT_TYPOGRAPHY] ??
    TYPOGRAPHY_FONTS[DEFAULT_TYPOGRAPHY]
  );
}

/** Toutes les classes de variables (pour les APERÇUS de l'admin). */
export const TYPOGRAPHY_ALL_CLASSES = [
  ...new Set(
    Object.values(TYPOGRAPHY_FONTS).flatMap((p) => p.className.split(" ")),
  ),
]
  .filter(Boolean)
  .join(" ");
