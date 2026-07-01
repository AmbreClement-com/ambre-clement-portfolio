import { ImageResponse } from "next/og";

/**
 * Icône d'application (PWA / apple-touch-icon) : monogramme « AC » centré sur le fond
 * noir de la marque, comme l'image Open Graph. Le monogramme occupe ~40 % → il reste
 * dans la zone de sécurité des icônes « maskable » (Android le masque en cercle/carré).
 */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontWeight: 300,
          fontSize: Math.round(size * 0.4),
          letterSpacing: Math.round(size * 0.02),
        }}
      >
        AC
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
