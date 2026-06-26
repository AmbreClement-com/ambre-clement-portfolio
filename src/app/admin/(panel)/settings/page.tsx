import { eq } from "drizzle-orm";
import { getSettings } from "@/server/db/queries/projects";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { isThemeKey } from "@/lib/themes";
import { SettingsForm } from "@/components/admin/settings-form";
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
import { User, Palette, Globe, Lock } from "lucide-react";

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
  const themeRaw = settings?.theme;
  const theme = isThemeKey(themeRaw) ? themeRaw : "default";

  return (
    <div className="grid gap-6">
      <PageHeader title="Réglages" description="Profil, apparence et informations du site." />

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

      {/* Site */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Site
          </CardTitle>
          <CardDescription>
            Coordonnées et liens affichés sur le site public.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
