import {
  getCategoryPhotos,
  getCategoryProjects,
  getSettings,
} from "@/server/db/queries/projects";
import { PhotosScroller } from "@/components/public/photos-scroller";
import { ProjectsCinema } from "@/components/public/projects-cinema";
import { FrameMeta } from "@/components/public/frame-context";
import { resolveAnimations, TRANSITION_SPEED_FACTOR } from "@/lib/animations";
import type { Category } from "@/server/db/schema";

/**
 * Rend le contenu d'un onglet selon son type.
 * - photos  → galerie (le nom de page est affiché par le cadre global)
 * - projets → navigateur cinématique plein écran (HUD propre, pas de cadre global)
 */
export async function CategoryView({ category }: { category: Category }) {
  if (category.type === "photos") {
    const [photos, settings] = await Promise.all([
      getCategoryPhotos(category.id).catch(() => []),
      getSettings().catch(() => null),
    ]);
    const anims = resolveAnimations(settings?.animations);
    // Marge élargie et SYMÉTRIQUE sur tablette (px-16 = 64px) : la gauche doit dégager les
    // icônes réseaux du cadre (left-8 + size-4 = 48px), et on garde la galerie centrée en
    // appliquant la même marge à droite. Desktop inchangé (lg:px-12 = 48px).
    return (
      <div className="w-full px-11 pb-[4.5rem] pt-32 md:px-16 md:pb-24 md:pt-24 lg:px-12">
        {/* Le nom de la page s'affiche dans le cadre global (haut gauche). */}
        <FrameMeta title={category.name} count={photos.length} unit="Photos" />
        <h1 className="sr-only">{category.name} — Ambre Clément</h1>
        <PhotosScroller
          photos={photos}
          emptyLabel="Cette galerie sera bientôt en ligne."
          hoverEnabled={anims.photoHoverEnabled}
          hoverIntensity={anims.photoHoverIntensity}
          scrollEnabled={anims.scrollWaveEnabled}
          scrollIntensity={anims.scrollWaveIntensity}
          infiniteEnabled={anims.infiniteScrollEnabled}
        />
      </div>
    );
  }

  const [projects, settings] = await Promise.all([
    getCategoryProjects(category.id).catch(() => []),
    getSettings().catch(() => null),
  ]);
  const anims = resolveAnimations(settings?.animations);
  return (
    <>
      {/* Le cadre (compteur "01 / 06" du projet actif) est alimenté par le cinéma. */}
      <h1 className="sr-only">{category.name} — Ambre Clément</h1>
      <ProjectsCinema
        projects={projects}
        categoryName={category.name}
        transitionEnabled={anims.projectTransitionEnabled}
        transitionSpeed={TRANSITION_SPEED_FACTOR[anims.projectTransitionSpeed]}
      />
    </>
  );
}
