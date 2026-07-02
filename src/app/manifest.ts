import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DEFAULT_DESCRIPTION } from "@/lib/seo";

// Manifest PWA : permet l'ajout à l'écran d'accueil en mode « application » (standalone,
// sans barre d'adresse). Aucune incidence sur le design/layout du site lui-même.
// Splash + theme BLANCS = couleur du premier écran (intro `bg-white`) → pas de flash.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { getSettings } = await import("@/server/db/queries/projects");
  const settings = await getSettings().catch(() => null);
  const name = settings?.siteName?.trim() || SITE_NAME;
  return {
    id: "/",
    name: `${name} — Photographe`,
    short_name: name,
    description: SITE_DEFAULT_DESCRIPTION,
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
