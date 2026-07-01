import { renderAppIcon } from "@/lib/app-icon";

// Icônes du manifest PWA (PNG générés à la volée) : /icons/192 et /icons/512.
const ALLOWED: Record<string, number> = { "192": 192, "512": 512 };

export function generateStaticParams() {
  return Object.keys(ALLOWED).map((size) => ({ size }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  return renderAppIcon(ALLOWED[size] ?? 512);
}
