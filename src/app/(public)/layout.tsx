import { SiteHeader } from "@/components/public/site-header";
import { SiteFrame } from "@/components/public/site-frame";
import { FrameProvider } from "@/components/public/frame-context";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Analytics } from "@/components/public/analytics";
import { IntroOverlay } from "@/components/public/intro-overlay";
import {
  getSettings,
  getNavCategories,
  getPublishedPricings,
} from "@/server/db/queries/projects";
import {
  resolveAnimations,
  TRANSITION_SPEED_FACTOR,
} from "@/lib/animations";
import { getTypographyFonts } from "@/lib/typography-fonts";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories, publishedPricings] = await Promise.all([
    getSettings().catch(() => null),
    getNavCategories().catch(() => []),
    getPublishedPricings().catch(() => []),
  ]);

  // Réseaux sociaux : la liste éditable, avec repli sur les anciens champs
  // Instagram/LinkedIn tant qu'elle n'a pas été renseignée dans le back-office.
  const socials =
    settings?.socials && settings.socials.length > 0
      ? settings.socials
      : [
          ...(settings?.instagramUrl
            ? [{ platform: "instagram", url: settings.instagramUrl }]
            : []),
          ...(settings?.linkedinUrl
            ? [{ platform: "linkedin", url: settings.linkedinUrl }]
            : []),
        ];

  const anims = resolveAnimations(settings?.animations);
  const transitionSpeed = TRANSITION_SPEED_FACTOR[anims.pageTransitionSpeed];
  const loaderSpeed = TRANSITION_SPEED_FACTOR[anims.loaderSpeed];
  // Nom du site (réglable dans l'admin, carte « Site ») → navbar + loader.
  const siteName = settings?.siteName?.trim() || "Ambre Clément";
  // Thème typographique (carte « Typographie ») : polices titres + texte du site.
  const typoFonts = getTypographyFonts(settings?.typography);

  // Onglet « Tarifs » : visible dans la navbar dès qu'au moins un tarif est publié.
  const pricingNav =
    publishedPricings.length > 0
      ? { href: "/tarifs", label: "Tarifs" }
      : null;

  return (
    <FrameProvider>
      {/* Thème typographique : wrapper en `display:contents` (invisible pour le
          layout flex du body) qui pose les variables de police du thème actif —
          texte courant hérité, titres via [data-typo] h1-h3/.type-heading (cf.
          globals.css). Thème par défaut → variables --font-sans, rendu inchangé. */}
      <div
        data-typo
        data-typo-weight={settings?.typographyWeight ?? undefined}
        className={`contents ${typoFonts.className}`.trim()}
        style={
          {
            "--typo-heading": `var(${typoFonts.headingVar})`,
            "--typo-body": `var(${typoFonts.bodyVar})`,
            "--typo-mono": `var(${typoFonts.monoVar})`,
          } as React.CSSProperties
        }
      >
        <SiteHeader
          categories={categories}
          pricingNav={pricingNav}
          transitionsEnabled={anims.pageTransitionEnabled}
          speed={transitionSpeed}
          siteName={siteName}
        />
        <main className="flex-1">{children}</main>
        {/* Cadre global statique (remplace le footer) — nom de page, compteur,
            infos de bas de page, le tout en mix-blend sur le contenu. */}
        <SiteFrame
          socials={socials}
          email={settings?.email ?? null}
          speed={transitionSpeed}
          domainLabel={settings?.frameDomain?.trim() || null}
        />
        {/* Le curseur fluide n'existe QUE sur /contact (voir contact/page.tsx). */}
        <Analytics />
        <IntroOverlay
          enabled={anims.loaderEnabled}
          speed={loaderSpeed}
          siteName={siteName}
        />
      </div>
      {/* Barre admin flottante HORS du wrapper de thème : outil de back-office,
          elle garde la typo shadcn de base quel que soit le thème du site.
          Visible uniquement si connecté — la session est lue côté client. */}
      <AdminToolbar />
    </FrameProvider>
  );
}
