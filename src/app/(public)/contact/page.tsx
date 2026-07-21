import type { Metadata } from "next";
import { getSettings } from "@/server/db/queries/projects";
import { FrameMeta } from "@/components/public/frame-context";
import { ResponsiveImage } from "@/components/public/responsive-image";
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
  const phone = settings?.contactPhone ?? null;
  const location = settings?.contactLocation ?? null;
  const image = settings?.contactImage ?? null;

  return (
    // MOBILE : photo plein écran + texte par-dessus (inchangé). DESKTOP (md+) :
    // scindé — texte à GAUCHE sur fond blanc, photo pleine hauteur à DROITE.
    <main className="relative h-[100svh] w-full overflow-hidden bg-neutral-900 md:bg-white">
      <FrameMeta title="Contact" tone="dark" />

      {/* Image (éditable en réglages) : plein écran en mobile ; en desktop, un
          TIRAGE 3:4 bien plus petit, centré dans la moitié droite — même
          grammaire que les photos de la page Tarifs (ombre douce portée). */}
      {image && (
        <div className="absolute inset-0 md:left-1/2 md:flex md:items-center md:justify-center md:py-12 md:pl-8 md:pr-32">
          <div className="absolute inset-0 md:relative md:inset-auto md:aspect-[3/4] md:w-full md:max-w-sm md:overflow-hidden md:shadow-[0_24px_70px_-25px_rgba(0,0,0,0.4)]">
            <ResponsiveImage
              variants={image.variants}
              alt={title}
              width={image.width}
              height={image.height}
              lqip={image.lqip}
              priority
              sizes="(max-width: 767px) 100vw, 384px"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Voile pour la lisibilité du texte posé SUR la photo — mobile uniquement
          (en desktop le texte vit sur le blanc, la photo reste nue). Renforcé et
          VERTICAL (bas plus sombre = zone du texte, haut plus léger = la photo
          reste perceptible), même sur les images très claires. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/25 md:hidden" />

      {/* Texte : titre + paragraphe + email — padding gauche élargi pour dégager
          les icônes sociales du cadre (bord gauche, centre vertical). */}
      {/* Mobile : le contenu tient DANS le cadre (entre les repères haut/bas) et défile
          si le texte est long — ancré en bas pour les textes courts (inchangé).
          Desktop : COLONNE GAUCHE centrée VERTICALEMENT — le bloc texte répond au
          tirage photo centré de la colonne droite (composition équilibrée). */}
      <div className="absolute inset-x-0 top-28 bottom-16 flex flex-col justify-end overflow-y-auto pl-14 pr-12 md:inset-y-0 md:right-1/2 md:left-0 md:justify-center md:overflow-visible md:pl-40 md:pr-10 lg:pl-48">
        <h1
          className="c-rise max-w-3xl text-2xl font-light leading-[1.05] text-white sm:text-4xl md:text-6xl md:text-neutral-900"
          style={{ animationDelay: "0.12s" }}
        >
          {title}
        </h1>
        {text && (
          // Même registre que les mentions légales (lisibilité maximale) :
          // graisse normale, noir pur sur desktop, blanc plein sur mobile.
          <p
            className="c-rise mt-6 max-w-xl whitespace-pre-line text-[15px] font-normal leading-relaxed text-white sm:text-base md:text-black"
            style={{ animationDelay: "0.36s" }}
          >
            {text}
          </p>
        )}

        {/* Coordonnées : email, téléphone, lieu — MÊME taille (celle du texte),
            empilées l'une sous l'autre. Masquées si vides (réglages admin). */}
        <a
          href={`mailto:${email}`}
          data-track="contact_email"
          style={{ animationDelay: "0.5s" }}
          className="c-rise group mt-8 inline-flex max-w-full flex-wrap items-baseline gap-3 text-[15px] font-normal text-white sm:text-base md:text-black"
        >
          <span className="break-all bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out group-hover:bg-[length:0%_1px]">
            {email}
          </span>
          <span className="transition-transform duration-500 group-hover:translate-x-1">
            ↗
          </span>
        </a>
        {(phone || location) && (
          <div
            className="c-rise mt-2.5 flex flex-col items-start gap-1.5 text-[15px] font-normal text-white sm:text-base md:text-black"
            style={{ animationDelay: "0.62s" }}
          >
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                data-track="contact_phone"
                className="transition-opacity hover:opacity-70"
              >
                {phone}
              </a>
            )}
            {location && <span>{location}</span>}
          </div>
        )}
      </div>

    </main>
  );
}
