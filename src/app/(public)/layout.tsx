import { SiteHeader } from "@/components/public/site-header";
import { SiteFrame } from "@/components/public/site-frame";
import { FrameProvider } from "@/components/public/frame-context";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Analytics } from "@/components/public/analytics";
import { IntroOverlay } from "@/components/public/intro-overlay";
import { getSettings, getNavCategories } from "@/server/db/queries/projects";
import {
  resolveAnimations,
  TRANSITION_SPEED_FACTOR,
} from "@/lib/animations";
import { resolvePricing } from "@/lib/pricing";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories] = await Promise.all([
    getSettings().catch(() => null),
    getNavCategories().catch(() => []),
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

  // Page Tarifs : n'apparaît dans la navbar QUE si elle est publiée.
  const pricing = resolvePricing(settings?.pricing);
  const pricingNav = pricing.published
    ? { href: "/tarifs", label: pricing.navLabel || "Tarifs" }
    : null;

  return (
    <FrameProvider>
      <SiteHeader
        categories={categories}
        pricingNav={pricingNav}
        transitionsEnabled={anims.pageTransitionEnabled}
        speed={transitionSpeed}
      />
      <main className="flex-1">{children}</main>
      {/* Cadre global statique (remplace le footer) — nom de page, compteur,
          infos de bas de page, le tout en mix-blend sur le contenu. */}
      <SiteFrame
        socials={socials}
        email={settings?.email ?? null}
        speed={transitionSpeed}
      />
      {/* Le curseur fluide n'existe QUE sur /contact (voir contact/page.tsx). */}
      {/* Visible uniquement si connecté — la session est lue côté client */}
      <AdminToolbar />
      <Analytics />
      <IntroOverlay enabled={anims.loaderEnabled} speed={loaderSpeed} />
    </FrameProvider>
  );
}
