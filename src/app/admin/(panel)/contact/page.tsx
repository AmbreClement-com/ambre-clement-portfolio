import { getSettings } from "@/server/db/queries/projects";
import { ContactForm } from "@/components/admin/contact-form";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { AtSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminContactPage() {
  const settings = await getSettings().catch(() => null);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Contact"
        description="Coordonnées et contenu de la page Contact du site."
      />
      {/* overflow-visible : requis par le bouton Enregistrer sticky (SaveBar). */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="size-4 text-primary" />
            Page Contact
          </CardTitle>
          <CardDescription>
            Email, téléphone, lieu, image plein écran, titre et texte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Champs PRÉ-REMPLIS avec la valeur EFFECTIVE (replis du site compris). */}
          <ContactForm
            settings={{
              ...settings,
              email: settings?.email || "contact@ambreclement.com",
              contactTitle:
                settings?.contactTitle || "Donnons vie à vos images",
              contactText: settings?.contactText ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
