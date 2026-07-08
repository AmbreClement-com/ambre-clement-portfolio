import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCategoryProjects,
  getFirstCategory,
  getProjectBySlug,
  getPublishedSlugs,
  getSettings,
} from "@/server/db/queries/projects";
import { PhotosScroller } from "@/components/public/photos-scroller";
import { ProjectBackButton } from "@/components/public/project-back-button";
import { ProjectTransitionMount } from "@/components/public/project-transition-mount";
import { FrameMeta } from "@/components/public/frame-context";
import { resolveAnimations } from "@/lib/animations";
import { buildMetadata, projectJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs().catch(() => []);
  return slugs.map((s) => ({ slug: s.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug).catch(() => null);
  if (!project) return buildMetadata({ title: "Projet introuvable", noIndex: true });

  const cover =
    project.photos.find((p) => p.id === project.coverPhotoId) ?? project.photos[0];

  return buildMetadata({
    title: project.seoTitle ?? project.title,
    description: project.seoDescription ?? project.description ?? undefined,
    path: `/projects/${project.slug}`,
    image: cover?.variants.webp.at(-1)?.url,
  });
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const [project, settings, first] = await Promise.all([
    getProjectBySlug(slug).catch(() => null),
    getSettings().catch(() => null),
    getFirstCategory().catch(() => null),
  ]);
  if (!project) notFound();

  const anims = resolveAnimations(settings?.animations);
  // Titre du cadre (haut-gauche) = nom de la catégorie « projets » (le titre GLOBAL,
  // ex. « Projets »), pas le nom du projet courant (lui va dans le HUD de droite).
  const frameTitle = project.category?.name ?? "Projets";
  const yy = project.shotDate?.slice(0, 4);
  const projectYear = yy && /^\d{4}$/.test(yy) ? yy : null;
  // URL du cinéma = la catégorie du projet (la 1re catégorie est servie par "/").
  const cinemaUrl =
    (first && project.categoryId === first.id) || !project.category
      ? "/"
      : `/${project.category.slug}`;

  // projets voisins de la catégorie → navigation précédent / suivant (cyclique).
  const siblings = project.categoryId
    ? await getCategoryProjects(project.categoryId).catch(() => [])
    : [];
  const cur = Math.max(
    0,
    siblings.findIndex((p) => p.id === project.id),
  );
  const total = siblings.length;
  const prevIdx = (cur - 1 + total) % total;
  const nextIdx = (cur + 1) % total;
  const prevP = total > 1 ? siblings[prevIdx] : null;
  const nextP = total > 1 ? siblings[nextIdx] : null;
  // Numéros (positions) affichés au centre du footer : celui du préc. / celui du suiv.
  const prevNum = total > 1 ? prevIdx + 1 : null;
  const nextNum = total > 1 ? nextIdx + 1 : null;

  const jsonLd = projectJsonLd({
    title: project.title,
    description: project.description ?? undefined,
    slug: project.slug,
    images: project.photos
      .map((p) => p.variants.webp.at(-1)?.url ?? "")
      .filter(Boolean),
    datePublished: project.publishedAt?.toISOString(),
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Portfolio", path: "/" },
    { name: "Projets", path: "/projects" },
    { name: project.title, path: `/projects/${project.slug}` },
  ]);

  // Exactement une page « photos » : galerie WebGL avec les photos du projet,
  // le titre du projet s'affiche dans le cadre global (haut gauche).
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <ProjectTransitionMount />
      <ProjectBackButton cinemaUrl={cinemaUrl} slug={project.slug} />
      <div className="w-full px-11 pb-[4.5rem] pt-32 md:px-16 md:pb-24 md:pt-24 lg:px-12">
        <FrameMeta
          title={frameTitle}
          count={project.photos.length}
          unit="Photos"
          navIndex={cur + 1}
          navTotal={total}
          navPrev={prevP?.slug ?? null}
          navNext={nextP?.slug ?? null}
          navPrevTitle={prevP?.title ?? null}
          navNextTitle={nextP?.title ?? null}
          navPrevNum={prevNum}
          navNextNum={nextNum}
          projectTitle={project.title}
          projectLocation={project.location}
          projectYear={projectYear}
          // Surbrillance dans la navbar = la CATÉGORIE parente (le cinéma d'où vient le
          // projet). `cinemaUrl` correspond exactement au href du menu ("/" ou "/slug").
          activeHref={cinemaUrl}
        />
        <h1 className="sr-only">{project.title} — Ambre Clément</h1>
        <PhotosScroller
          photos={project.photos}
          emptyLabel="Cette galerie sera bientôt en ligne."
          hoverEnabled={anims.photoHoverEnabled}
          hoverIntensity={anims.photoHoverIntensity}
          dimEnabled={anims.photoDimEnabled}
          dimIntensity={anims.photoDimIntensity}
          scrollEnabled={anims.scrollWaveEnabled}
          scrollIntensity={anims.scrollWaveIntensity}
          infiniteEnabled={anims.infiniteScrollEnabled}
        />
      </div>
    </>
  );
}
