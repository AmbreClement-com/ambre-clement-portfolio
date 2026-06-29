import { PageHeader } from "@/components/admin/page-header";
import { PricingForm } from "@/components/admin/pricing-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouveau tarif", robots: { index: false } };

export default function NewTarifPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Nouveau tarif"
        backHref="/admin/tarifs"
        backLabel="Tarifs"
      />
      <PricingForm />
    </div>
  );
}
