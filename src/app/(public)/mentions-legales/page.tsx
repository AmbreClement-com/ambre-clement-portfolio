import type { Metadata } from "next";
import { getSettings } from "@/server/db/queries/projects";
import { Reveal } from "@/components/public/reveal";
import { FrameMeta } from "@/components/public/frame-context";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Mentions légales",
  path: "/mentions-legales",
  description: "Mentions légales du site d'Ambre Clément.",
});

type LegalSection = { title: string | null; body: string };

/**
 * Découpe le texte libre des Réglages en sections : les blocs sont séparés par
 * des lignes vides multiples, et une première ligne TOUT EN CAPITALES devient
 * l'intertitre du bloc (grammaire mono/uppercase du cadre). Un texte sans cette
 * structure s'affiche tel quel, en paragraphes.
 */
function parseLegal(text: string): LegalSection[] {
  const isHeading = (l: string) =>
    l.length > 0 && l.length < 60 && l === l.toUpperCase() && /[A-ZÀ-Ý]/.test(l);
  return text
    .trim()
    .split(/\n{3,}/)
    .map((block) => {
      const lines = block.trim().split("\n");
      if (isHeading(lines[0]!) && lines.length > 1) {
        return { title: lines[0]!, body: lines.slice(1).join("\n").trim() };
      }
      return { title: null, body: block.trim() };
    })
    .filter((s) => s.body.length > 0 || s.title);
}

export default async function LegalPage() {
  const settings = await getSettings().catch(() => null);
  const sections = settings?.legalNotice
    ? parseLegal(settings.legalNotice)
    : null;

  return (
    // pt-36 mobile : le contenu démarre 24px SOUS les repères d'angle du cadre
    // (104-120px) — même respiration qu'aux côtés. Desktop inchangé.
    <main className="mx-auto min-h-screen w-full max-w-3xl px-11 pb-28 pt-36 md:px-6 md:pb-36 md:pt-40">
      <FrameMeta title="Mentions légales" />
      <h1 className="sr-only">Mentions légales</h1>

      <Reveal>
        {sections ? (
          <div className="grid gap-10 md:gap-12">
            {sections.map((s, i) => (
              <section key={s.title ?? i}>
                {s.title && (
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black">
                    {s.title}
                  </h2>
                )}
                <div className="mt-3 max-w-2xl whitespace-pre-line text-[15px] font-normal leading-relaxed text-black sm:text-base">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-black">Mentions légales à venir.</p>
        )}
      </Reveal>
    </main>
  );
}
