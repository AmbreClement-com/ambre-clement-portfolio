import { eq } from "drizzle-orm";
import { getSettings } from "@/server/db/queries/projects";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { isThemeKey } from "@/lib/themes";
import { SITE_NAME, siteDomain } from "@/lib/seo";
import { SettingsForm } from "@/components/admin/settings-form";
import { AnimationsForm } from "@/components/admin/animations-form";
import { ProfileForm } from "@/components/admin/profile-form";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { ThemePicker } from "@/components/admin/theme-picker";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { User, Palette, Globe, Lock, Sparkles, Type } from "lucide-react";
import { TypographySelector } from "@/components/admin/typography-selector";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  const [settings, me] = await Promise.all([
    getSettings().catch(() => null),
    session?.user?.email
      ? db.query.users
          .findFirst({ where: eq(users.email, session.user.email) })
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  // Thème PROPRE À L'UTILISATEUR connecté (plus un réglage global).
  const theme = isThemeKey(me?.theme) ? me.theme : "default";

  return (
    <div className="grid gap-6">
      <PageHeader title="Réglages" description="Profil, apparence et informations du site." />

      {/* Utilisateurs & Développeur : accessibles depuis la sidebar (pas de doublon ici). */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gauche : Compte */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                firstName={me?.firstName ?? null}
                lastName={me?.lastName ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </div>

        {/* Droite : Apparence */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              Apparence
            </CardTitle>
            <CardDescription>
              Thème du back-office (le site public reste inchangé).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ThemePicker current={theme} />
          </CardContent>
        </Card>
      </div>

      {/* Site : identité + mentions légales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Site
          </CardTitle>
          <CardDescription>
            Identité du site (nom, domaine affiché) et mentions légales. Les
            coordonnées et réseaux sociaux sont dans l&apos;onglet Contact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Champs PRÉ-REMPLIS avec la valeur EFFECTIVE (celle que le site affiche
              réellement, replis compris) — jamais un champ vide trompeur. */}
          <SettingsForm
            settings={{
              siteName: settings?.siteName?.trim() || SITE_NAME,
              frameDomain: settings?.frameDomain?.trim() || siteDomain(),
              legalNotice: settings?.legalNotice ?? null,
            }}
          />
        </CardContent>
      </Card>

      {/* Typographie : thème de polices du site public */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="size-4 text-primary" />
            Typographie
          </CardTitle>
          <CardDescription>
            La voix du site : une police pour les titres, une pour le texte.
            Cliquez un thème pour l&apos;appliquer immédiatement à TOUT le
            portfolio — cadre, animations et compteurs compris (survolez pour
            savoir pourquoi la combinaison fonctionne).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TypographySelector
            current={settings?.typography ?? null}
            currentWeight={settings?.typographyWeight ?? null}
          />
        </CardContent>
      </Card>

      {/* Animations : carte dédiée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Animations
          </CardTitle>
          <CardDescription>
            Effets visuels du site public : intensité, vitesses et aperçus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimationsForm animations={settings?.animations} />
        </CardContent>
      </Card>
    </div>
  );
}
