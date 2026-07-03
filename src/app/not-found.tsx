import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/server/db/queries/projects";
import { getTypographyFonts } from "@/lib/typography-fonts";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default async function NotFound() {
  // La 404 vit HORS du layout public → on lui applique le thème typographique
  // nous-mêmes (mêmes variables que le wrapper [data-typo] du site).
  const settings = await getSettings().catch(() => null);
  const typo = getTypographyFonts(settings?.typography);

  return (
    <div
      data-typo
      className={`flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center ${typo.className}`.trim()}
      style={
        {
          "--typo-heading": `var(${typo.headingVar})`,
          "--typo-body": `var(${typo.bodyVar})`,
          "--typo-mono": `var(${typo.monoVar})`,
        } as React.CSSProperties
      }
    >
      <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Erreur 404</p>
      <h1 className="text-2xl font-light tracking-wide">Cette page est introuvable</h1>
      <Link
        href="/"
        className="text-sm uppercase tracking-wide text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        Retour au portfolio
      </Link>
    </div>
  );
}
