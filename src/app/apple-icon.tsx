import { renderAppIcon } from "@/lib/app-icon";

// Icône « ajouter à l'écran d'accueil » sur iOS (Next l'associe automatiquement via
// <link rel="apple-touch-icon">).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
