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

export default async function LegalPage() {
  const settings = await getSettings().catch(() => null);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-11 pb-24 pt-28 md:px-6 md:pb-32 md:pt-44">
      <FrameMeta title="Mentions légales" />
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-400">
          Informations légales
        </p>
        <h1 className="mt-6 text-3xl font-extralight uppercase tracking-[0.02em] sm:text-4xl md:text-6xl">
          Mentions légales
        </h1>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-14 border-t border-neutral-200 pt-10">
          {settings?.legalNotice ? (
            <div className="whitespace-pre-line text-base font-light leading-relaxed text-neutral-600">
              {settings.legalNotice}
            </div>
          ) : (
            <p className="text-neutral-400">Mentions légales à venir.</p>
          )}
        </div>
      </Reveal>
    </main>
  );
}
