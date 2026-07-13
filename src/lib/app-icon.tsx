import { ImageResponse } from "next/og";
import { getSettings } from "@/server/db/queries/projects";
import { TYPOGRAPHY_THEMES, DEFAULT_TYPOGRAPHY } from "@/lib/typography-themes";

/**
 * Police de TITRES du thème typographique actif, en TTF minimal (2 glyphes
 * « AC ») récupéré auprès de Google Fonts : satori (ImageResponse) ne lit pas
 * les woff2 auto-hébergés de next/font. Appel SERVEUR uniquement (le visiteur
 * ne contacte jamais Google → RGPD inchangé), mis en cache 1 h, échec
 * silencieux → l'icône se rend alors dans la police par défaut.
 */
async function loadHeadingFont(): Promise<{
  family: string;
  data: ArrayBuffer;
} | null> {
  try {
    const settings = await getSettings().catch(() => null);
    const id = settings?.typography ?? DEFAULT_TYPOGRAPHY;
    const family = (
      TYPOGRAPHY_THEMES.find((t) => t.id === id) ??
      TYPOGRAPHY_THEMES.find((t) => t.id === DEFAULT_TYPOGRAPHY)
    )?.heading;
    if (!family) return null;
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&text=AC`,
      // Sans UA de navigateur moderne, Google renvoie des URLs TTF (lisibles par satori).
      { headers: { "User-Agent": "curl/8" }, next: { revalidate: 3600 } },
    ).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (!url) return null;
    const data = await fetch(url, { next: { revalidate: 3600 } }).then((r) =>
      r.ok ? r.arrayBuffer() : null,
    );
    return data ? { family, data } : null;
  } catch {
    return null;
  }
}

/**
 * Icône d'application (favicon / PWA / apple-touch-icon) : monogramme « AC »
 * NOIR sur carré BLANC, dans la police de titres du thème typo choisi dans
 * l'admin. Le monogramme occupe ~44 % → il reste dans la zone de sécurité des
 * icônes « maskable » (Android le masque en cercle/carré).
 */
export async function renderAppIcon(size: number) {
  const font = await loadHeadingFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: font?.family,
          fontSize: Math.round(size * 0.44),
          letterSpacing: Math.round(size * 0.02),
        }}
      >
        AC
      </div>
    ),
    {
      width: size,
      height: size,
      // Pas « immutable » : l'icône suit le thème typo (changeable dans l'admin).
      headers: { "Cache-Control": "public, max-age=3600" },
      fonts: font
        ? [{ name: font.family, data: font.data, style: "normal", weight: 400 }]
        : undefined,
    },
  );
}
