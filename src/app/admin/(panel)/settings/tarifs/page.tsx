import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getSettings } from "@/server/db/queries/projects";
import { resolvePricing } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { PricingForm } from "@/components/admin/pricing-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifs", robots: { index: false } };

export default async function PricingSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const settings = await getSettings().catch(() => null);
  const pricing = resolvePricing(settings?.pricing);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Page Tarifs"
        description="Contenu et publication de la page de tarification."
        backHref="/admin/settings"
        backLabel="Réglages"
        badge={
          <Badge variant={pricing.published ? "secondary" : "outline"}>
            {pricing.published ? "Publiée" : "Non publiée"}
          </Badge>
        }
      />
      <PricingForm initial={pricing} />
    </div>
  );
}
