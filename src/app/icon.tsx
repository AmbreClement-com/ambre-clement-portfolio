import { renderAppIcon } from "@/lib/app-icon";

// Favicon (onglet navigateur) — généré à la volée : « AC » noir sur carré blanc,
// dans la police de titres du thème typo actif (cf. lib/app-icon).
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(64);
}
