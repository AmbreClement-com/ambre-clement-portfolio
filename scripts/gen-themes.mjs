/**
 * Génère les vrais thèmes (palettes complètes) :
 *  - src/app/themes.css       → blocs [data-theme="..."]
 *  - src/lib/themes.ts        → liste + aperçus pour le sélecteur
 * Lancer : node scripts/gen-themes.mjs
 */
import { writeFileSync } from "node:fs";

const r = (n) => Number(n.toFixed(3));
const ok = (l, c, h) => `oklch(${r(l)} ${r(c)} ${r(h)})`;

// Thème clair coloré (carte blanche, fond légèrement teinté)
function light({ hue: h, pl, pc, darkFg, tint = 1 }) {
  const fg = ok(0.21, 0.03 * tint, h);
  const sFg = ok(0.3, 0.05 * tint, h);
  return {
    background: ok(0.99, 0.008 * tint, h),
    foreground: fg,
    card: ok(1, 0, 0),
    "card-foreground": fg,
    popover: ok(1, 0, 0),
    "popover-foreground": fg,
    primary: ok(pl, pc, h),
    "primary-foreground": darkFg ? ok(0.2, 0.03, h) : ok(0.99, 0, 0),
    secondary: ok(0.96, 0.02 * tint, h),
    "secondary-foreground": sFg,
    muted: ok(0.96, 0.015 * tint, h),
    "muted-foreground": ok(0.5, 0.03 * tint, h),
    accent: ok(0.94, 0.04 * tint, h),
    "accent-foreground": sFg,
    border: ok(0.91, 0.02 * tint, h),
    input: ok(0.91, 0.02 * tint, h),
    ring: ok(pl, pc, h),
  };
}

// Thème sombre
function dark({ hue: h, pl, pc, darkFg, neutralPrimary, bgL = 0.18 }) {
  const fg = ok(0.96, neutralPrimary ? 0.004 : 0.008, h);
  return {
    background: ok(bgL, neutralPrimary ? 0.004 : 0.02, h),
    foreground: fg,
    card: ok(bgL + 0.045, neutralPrimary ? 0.005 : 0.025, h),
    "card-foreground": fg,
    popover: ok(bgL + 0.045, neutralPrimary ? 0.005 : 0.025, h),
    "popover-foreground": fg,
    primary: ok(pl, pc, h),
    "primary-foreground": neutralPrimary
      ? ok(0.2, 0.02, h)
      : darkFg
        ? ok(0.16, 0.03, h)
        : ok(0.98, 0, 0),
    secondary: ok(0.275, 0.025, h),
    "secondary-foreground": fg,
    muted: ok(0.275, 0.025, h),
    "muted-foreground": ok(0.72, 0.03, h),
    accent: ok(0.305, 0.03, h),
    "accent-foreground": fg,
    destructive: ok(0.704, 0.191, 22.2),
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 14%)",
    ring: ok(pl, pc, h),
  };
}

// key, label, generator + params. (« default » = :root, non listé ici.)
const SPEC = [
  // — Neutres —
  ["slate", "Ardoise", light, { hue: 265, pl: 0.28, pc: 0.03, tint: 0.4 }],
  ["stone", "Pierre", light, { hue: 60, pl: 0.27, pc: 0.02, tint: 0.4 }],
  // — Clairs colorés —
  ["rose", "Rose", light, { hue: 12, pl: 0.58, pc: 0.2 }],
  ["red", "Rouge", light, { hue: 25, pl: 0.58, pc: 0.2 }],
  ["orange", "Orange", light, { hue: 55, pl: 0.66, pc: 0.16 }],
  ["amber", "Ambre", light, { hue: 75, pl: 0.8, pc: 0.15, darkFg: true }],
  ["forest", "Forêt", light, { hue: 150, pl: 0.52, pc: 0.12 }],
  ["emerald", "Émeraude", light, { hue: 162, pl: 0.6, pc: 0.13 }],
  ["teal", "Sarcelle", light, { hue: 185, pl: 0.58, pc: 0.1 }],
  ["ocean", "Océan", light, { hue: 235, pl: 0.55, pc: 0.16 }],
  ["blue", "Bleu", light, { hue: 255, pl: 0.55, pc: 0.18 }],
  ["indigo", "Indigo", light, { hue: 275, pl: 0.52, pc: 0.2 }],
  ["violet", "Violet", light, { hue: 293, pl: 0.55, pc: 0.22 }],
  ["fuchsia", "Fuchsia", light, { hue: 322, pl: 0.58, pc: 0.24 }],
  // — Sombres —
  ["midnight", "Minuit", dark, { hue: 264, pl: 0.62, pc: 0.21, darkFg: true }],
  ["obsidian", "Obsidienne", dark, { hue: 0, pl: 0.95, pc: 0, neutralPrimary: true, bgL: 0.13 }],
  ["nocturne", "Nocturne", dark, { hue: 285, pl: 0.66, pc: 0.2, darkFg: true }],
  ["ember", "Braise", dark, { hue: 50, pl: 0.72, pc: 0.16, darkFg: true }],
];

let css =
  "/* Généré par scripts/gen-themes.mjs — vrais thèmes (palettes complètes). */\n" +
  '/* « default » = :root (globals.css). data-theme scopé au back-office. */\n\n';
const list = [
  { key: "default", label: "Défaut", bg: "oklch(1 0 0)", fg: "oklch(0.145 0 0)", primary: "oklch(0.205 0 0)", muted: "oklch(0.97 0 0)" },
];

for (const [key, label, gen, params] of SPEC) {
  const v = gen(params);
  const decls = Object.entries(v)
    .map(([k, val]) => `  --${k}: ${val};`)
    .join("\n");
  css += `[data-theme="${key}"] {\n${decls}\n}\n`;
  list.push({
    key,
    label,
    bg: v.background,
    fg: v.foreground,
    primary: v.primary,
    muted: v.muted,
  });
}

writeFileSync("src/app/themes.css", css);

const ts =
  `/**\n * Vrais thèmes (palettes complètes). GÉNÉRÉ par scripts/gen-themes.mjs.\n` +
  ` * Les variables sont dans src/app/themes.css ; ici = aperçu du sélecteur.\n */\n` +
  `export const THEMES = ${JSON.stringify(list, null, 2)} as const;\n\n` +
  `export type ThemeKey = (typeof THEMES)[number]["key"];\n\n` +
  `export const THEME_KEYS = THEMES.map((t) => t.key) as ThemeKey[];\n\n` +
  `export function isThemeKey(v: unknown): v is ThemeKey {\n` +
  `  return typeof v === "string" && (THEME_KEYS as string[]).includes(v);\n}\n`;

writeFileSync("src/lib/themes.ts", ts);

console.log(`✓ ${list.length} thèmes générés (themes.css + themes.ts)`);
