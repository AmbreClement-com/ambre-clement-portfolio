/**
 * Vrais thèmes (palettes complètes). GÉNÉRÉ par scripts/gen-themes.mjs.
 * Les variables sont dans src/app/themes.css ; ici = aperçu du sélecteur.
 */
export const THEMES = [
  {
    "key": "default",
    "label": "Défaut",
    "bg": "oklch(1 0 0)",
    "fg": "oklch(0.145 0 0)",
    "primary": "oklch(0.205 0 0)",
    "muted": "oklch(0.97 0 0)"
  },
  {
    "key": "slate",
    "label": "Ardoise",
    "bg": "oklch(0.99 0.003 265)",
    "fg": "oklch(0.21 0.012 265)",
    "primary": "oklch(0.28 0.03 265)",
    "muted": "oklch(0.96 0.006 265)"
  },
  {
    "key": "stone",
    "label": "Pierre",
    "bg": "oklch(0.99 0.003 60)",
    "fg": "oklch(0.21 0.012 60)",
    "primary": "oklch(0.27 0.02 60)",
    "muted": "oklch(0.96 0.006 60)"
  },
  {
    "key": "rose",
    "label": "Rose",
    "bg": "oklch(0.99 0.008 12)",
    "fg": "oklch(0.21 0.03 12)",
    "primary": "oklch(0.58 0.2 12)",
    "muted": "oklch(0.96 0.015 12)"
  },
  {
    "key": "red",
    "label": "Rouge",
    "bg": "oklch(0.99 0.008 25)",
    "fg": "oklch(0.21 0.03 25)",
    "primary": "oklch(0.58 0.2 25)",
    "muted": "oklch(0.96 0.015 25)"
  },
  {
    "key": "orange",
    "label": "Orange",
    "bg": "oklch(0.99 0.008 55)",
    "fg": "oklch(0.21 0.03 55)",
    "primary": "oklch(0.66 0.16 55)",
    "muted": "oklch(0.96 0.015 55)"
  },
  {
    "key": "amber",
    "label": "Ambre",
    "bg": "oklch(0.99 0.008 75)",
    "fg": "oklch(0.21 0.03 75)",
    "primary": "oklch(0.8 0.15 75)",
    "muted": "oklch(0.96 0.015 75)"
  },
  {
    "key": "forest",
    "label": "Forêt",
    "bg": "oklch(0.99 0.008 150)",
    "fg": "oklch(0.21 0.03 150)",
    "primary": "oklch(0.52 0.12 150)",
    "muted": "oklch(0.96 0.015 150)"
  },
  {
    "key": "emerald",
    "label": "Émeraude",
    "bg": "oklch(0.99 0.008 162)",
    "fg": "oklch(0.21 0.03 162)",
    "primary": "oklch(0.6 0.13 162)",
    "muted": "oklch(0.96 0.015 162)"
  },
  {
    "key": "teal",
    "label": "Sarcelle",
    "bg": "oklch(0.99 0.008 185)",
    "fg": "oklch(0.21 0.03 185)",
    "primary": "oklch(0.58 0.1 185)",
    "muted": "oklch(0.96 0.015 185)"
  },
  {
    "key": "ocean",
    "label": "Océan",
    "bg": "oklch(0.99 0.008 235)",
    "fg": "oklch(0.21 0.03 235)",
    "primary": "oklch(0.55 0.16 235)",
    "muted": "oklch(0.96 0.015 235)"
  },
  {
    "key": "blue",
    "label": "Bleu",
    "bg": "oklch(0.99 0.008 255)",
    "fg": "oklch(0.21 0.03 255)",
    "primary": "oklch(0.55 0.18 255)",
    "muted": "oklch(0.96 0.015 255)"
  },
  {
    "key": "indigo",
    "label": "Indigo",
    "bg": "oklch(0.99 0.008 275)",
    "fg": "oklch(0.21 0.03 275)",
    "primary": "oklch(0.52 0.2 275)",
    "muted": "oklch(0.96 0.015 275)"
  },
  {
    "key": "violet",
    "label": "Violet",
    "bg": "oklch(0.99 0.008 293)",
    "fg": "oklch(0.21 0.03 293)",
    "primary": "oklch(0.55 0.22 293)",
    "muted": "oklch(0.96 0.015 293)"
  },
  {
    "key": "fuchsia",
    "label": "Fuchsia",
    "bg": "oklch(0.99 0.008 322)",
    "fg": "oklch(0.21 0.03 322)",
    "primary": "oklch(0.58 0.24 322)",
    "muted": "oklch(0.96 0.015 322)"
  },
  {
    "key": "midnight",
    "label": "Minuit",
    "bg": "oklch(0.18 0.02 264)",
    "fg": "oklch(0.96 0.008 264)",
    "primary": "oklch(0.62 0.21 264)",
    "muted": "oklch(0.275 0.025 264)"
  },
  {
    "key": "obsidian",
    "label": "Obsidienne",
    "bg": "oklch(0.13 0.004 0)",
    "fg": "oklch(0.96 0.004 0)",
    "primary": "oklch(0.95 0 0)",
    "muted": "oklch(0.275 0.025 0)"
  },
  {
    "key": "nocturne",
    "label": "Nocturne",
    "bg": "oklch(0.18 0.02 285)",
    "fg": "oklch(0.96 0.008 285)",
    "primary": "oklch(0.66 0.2 285)",
    "muted": "oklch(0.275 0.025 285)"
  },
  {
    "key": "ember",
    "label": "Braise",
    "bg": "oklch(0.18 0.02 50)",
    "fg": "oklch(0.96 0.008 50)",
    "primary": "oklch(0.72 0.16 50)",
    "muted": "oklch(0.275 0.025 50)"
  }
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

const THEME_KEYS = THEMES.map((t) => t.key) as ThemeKey[];

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === "string" && (THEME_KEYS as string[]).includes(v);
}
