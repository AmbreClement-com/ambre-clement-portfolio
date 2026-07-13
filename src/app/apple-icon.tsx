import { renderAppIcon } from "@/lib/app-icon";

// Icône « ajouter à l'écran d'accueil » sur iOS (Next l'associe automatiquement via
// <link rel="apple-touch-icon">). Dynamique : suit le thème typo choisi dans l'admin.
export const dynamic = "force-dynamic";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
