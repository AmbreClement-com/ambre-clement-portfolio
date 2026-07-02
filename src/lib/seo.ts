import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambreclement.com";

export const SITE_NAME = "Ambre Clément";
export const SITE_DEFAULT_DESCRIPTION =
  "Portfolio photographique d'Ambre Clément — portraits, maternité et projets.";

/** Domaine « propre » du site (sans www) — le repli du © du cadre. */
export function siteDomain(): string {
  try {
    const h = new URL(SITE_URL).host.replace(/^www\./, "");
    return h.includes("localhost") ? "ambreclement.com" : h;
  } catch {
    return "ambreclement.com";
  }
}

type BuildMetaInput = {
  title?: string;
  description?: string;
  path?: string; // chemin relatif, ex: "/projects/prana"
  image?: string; // URL absolue OG
  noIndex?: boolean;
};

/** Construit un objet Metadata Next.js cohérent (canonical + OG + Twitter). */
export function buildMetadata({
  title,
  description = SITE_DEFAULT_DESCRIPTION,
  path = "/",
  image,
  noIndex,
}: BuildMetaInput): Metadata {
  const url = new URL(path, SITE_URL).toString();
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const images = image ? [{ url: image }] : undefined;

  return {
    // `absolute` court-circuite le template du layout racine (évite le double suffixe)
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      url,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      images,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** JSON-LD : fil d'Ariane. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: new URL(it.path, SITE_URL).toString(),
    })),
  };
}

/** JSON-LD : une page projet en galerie d'images. */
export function projectJsonLd(opts: {
  title: string;
  description?: string;
  slug: string;
  images: string[];
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: opts.title,
    description: opts.description,
    url: new URL(`/projects/${opts.slug}`, SITE_URL).toString(),
    datePublished: opts.datePublished,
    author: { "@type": "Person", name: SITE_NAME },
    image: opts.images,
  };
}
