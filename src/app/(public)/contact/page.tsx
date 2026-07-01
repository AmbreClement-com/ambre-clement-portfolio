import type { Metadata } from "next";
import { getSettings } from "@/server/db/queries/projects";
import { FrameMeta } from "@/components/public/frame-context";
import { ResponsiveImage } from "@/components/public/responsive-image";
import SplashCursor from "@/components/public/splash-cursor";
import { resolveAnimations } from "@/lib/animations";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  path: "/contact",
  description: "Contactez Ambre Clément pour vos projets photographiques.",
});

export default async function ContactPage() {
  const settings = await getSettings().catch(() => null);
  const email = settings?.email ?? "contact@ambreclement.com";
  const title = settings?.contactTitle || "Donnons vie à vos images";
  const text = settings?.contactText;
  const image = settings?.contactImage ?? null;
  const anims = resolveAnimations(settings?.animations);

  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-neutral-900">
      <FrameMeta title="Contact" tone="dark" />

      {/* Image plein écran (éditable en réglages) */}
      {image && (
        <ResponsiveImage
          variants={image.variants}
          alt={title}
          width={image.width}
          height={image.height}
          lqip={image.lqip}
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Voile pour la lisibilité du texte à gauche */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />

      {/* Texte : titre + paragraphe + email — padding gauche élargi pour dégager
          les icônes sociales du cadre (bord gauche, centre vertical). */}
      {/* Mobile : le contenu tient DANS le cadre (entre les repères haut/bas) et défile
          si le texte est long — ancré en bas pour les textes courts. Desktop : ancré en
          bas comme à l'origine. */}
      <div className="absolute inset-x-0 top-28 bottom-16 flex flex-col justify-end overflow-y-auto pl-11 pr-6 md:inset-y-auto md:bottom-0 md:block md:overflow-visible md:pb-32 md:pl-24 md:pr-12 lg:max-w-4xl">
        <h1
          className="c-rise max-w-3xl text-2xl font-light leading-[1.05] text-white sm:text-4xl md:text-6xl"
          style={{ animationDelay: "0.12s" }}
        >
          {title}
        </h1>
        {text && (
          <p
            className="c-rise mt-6 max-w-xl whitespace-pre-line text-sm font-light leading-relaxed text-white/80 sm:text-base md:text-lg"
            style={{ animationDelay: "0.36s" }}
          >
            {text}
          </p>
        )}
        <a
          href={`mailto:${email}`}
          style={{ animationDelay: "0.5s" }}
          className="c-rise group mt-8 inline-flex max-w-full flex-wrap items-baseline gap-3 text-base font-light text-white sm:text-lg md:text-2xl"
        >
          <span className="break-all bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out group-hover:bg-[length:0%_1px]">
            {email}
          </span>
          <span className="transition-transform duration-500 group-hover:translate-x-1">
            ↗
          </span>
        </a>
      </div>

      {/* Curseur fluide (WebGL) — fumée BLANCHE en mix-blend-difference → INVERSE
          les couleurs de la photo dessous. L'opacité du calque doit rester ÉLEVÉE :
          sinon le blend « difference » n'est appliqué qu'en partie (ex. 0.3 = 30 %
          d'inversion seulement → voile fade). Le fond noir du fluide reste invisible
          (différence avec noir = inchangé), donc seule la fumée inverse vraiment.
          La subtilité vient des traînées (dissipation) et du rayon, pas de l'opacité.
          L'intensité back-office module l'opacité de 0.6 (douce) à 1 (inversion pleine). */}
      {anims.cursorEnabled && (
        <SplashCursor
          OPACITY={0.6 + 0.4 * (anims.cursorIntensity / 100)}
          DENSITY_DISSIPATION={3.2}
          SPLAT_RADIUS={0.2}
        />
      )}
    </main>
  );
}
