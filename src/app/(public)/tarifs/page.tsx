import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/server/db/queries/projects";
import { FrameMeta } from "@/components/public/frame-context";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { resolvePricing } from "@/lib/pricing";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const p = resolvePricing(settings?.pricing);
  if (!p.published) return buildMetadata({ title: "Tarifs", noIndex: true });
  return buildMetadata({
    title: p.navLabel || "Tarifs",
    path: "/tarifs",
    description: p.subtitle || p.title,
  });
}

export default async function PricingPage() {
  const settings = await getSettings().catch(() => null);
  const p = resolvePricing(settings?.pricing);
  // Page publiable : si non publiée, elle n'existe pas publiquement.
  if (!p.published) notFound();

  const paragraphs = p.intro
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className="min-h-[100svh] w-full bg-white px-6 pb-24 pt-24 text-neutral-900 md:px-12 lg:px-16">
      <FrameMeta title={p.navLabel || "Tarifs"} count={null} />

      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
        {/* PHOTO — à gauche (cadre type polaroïd) */}
        <div className="c-rise" style={{ animationDelay: "0.1s" }}>
          {p.image ? (
            <div className="mx-auto w-full max-w-md border border-neutral-900 bg-white p-2 shadow-[0_24px_70px_-25px_rgba(0,0,0,0.4)]">
              <ResponsiveImage
                variants={p.image.variants}
                alt={p.title}
                width={p.image.width}
                height={p.image.height}
                lqip={p.image.lqip}
                priority
                sizes="(max-width: 768px) 90vw, 45vw"
                className="h-auto w-full"
              />
            </div>
          ) : (
            <div className="mx-auto flex aspect-[3/4] w-full max-w-md items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-400">
              Aucune image
            </div>
          )}
        </div>

        {/* TEXTE — à droite */}
        <div>
          <h1
            className="c-rise text-3xl font-light uppercase tracking-wide md:text-5xl"
            style={{ animationDelay: "0.2s" }}
          >
            {p.title}
          </h1>
          {p.subtitle && (
            <p
              className="c-rise mt-3 text-sm font-medium text-neutral-600 md:text-base"
              style={{ animationDelay: "0.3s" }}
            >
              {p.subtitle}
            </p>
          )}

          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="c-rise mt-5 max-w-prose text-sm font-light leading-relaxed text-neutral-700 md:text-base"
              style={{ animationDelay: `${0.4 + i * 0.08}s` }}
            >
              {para}
            </p>
          ))}

          {p.includes.length > 0 && (
            <div className="c-rise mt-7" style={{ animationDelay: "0.72s" }}>
              <p className="text-sm font-medium text-neutral-900">
                La séance comprend :
              </p>
              <ul className="mt-2 grid gap-1.5 text-sm font-light text-neutral-700">
                {p.includes.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-neutral-400">·</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.price && (
            <p
              className="c-rise mt-8 inline-block bg-neutral-100 px-5 py-3 text-sm font-medium uppercase tracking-wide"
              style={{ animationDelay: "0.85s" }}
            >
              {p.price}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
