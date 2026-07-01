import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DEFAULT_DESCRIPTION } from "@/lib/seo";

// Manifest PWA : permet l'ajout à l'écran d'accueil en mode « application » (standalone,
// sans barre d'adresse). Aucune incidence sur le design/layout du site lui-même.
// Splash + theme BLANCS = couleur du premier écran (intro `bg-white`) → pas de flash.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — Photographe`,
    short_name: SITE_NAME,
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
