import { renderAppIcon } from "@/lib/app-icon";

// Icônes du manifest PWA (PNG générés à la volée) : /icons/192 et /icons/512.
// Dynamiques (plus de pré-rendu au build) : elles suivent le thème typo actif.
export const dynamic = "force-dynamic";

const ALLOWED: Record<string, number> = { "192": 192, "512": 512 };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  return renderAppIcon(ALLOWED[size] ?? 512);
}
