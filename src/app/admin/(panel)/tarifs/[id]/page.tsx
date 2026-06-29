import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pricings } from "@/server/db/schema";
import { PageHeader } from "@/components/admin/page-header";
import { PricingForm } from "@/components/admin/pricing-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifier le tarif", robots: { index: false } };

export default async function EditTarifPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.pricings
    .findFirst({ where: eq(pricings.id, id) })
    .catch(() => null);
  if (!row) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader
        title={row.title || "Tarif"}
        backHref="/admin/tarifs"
        backLabel="Tarifs"
        badge={
          <Badge variant={row.published ? "secondary" : "outline"}>
            {row.published ? "Publié" : "Brouillon"}
          </Badge>
        }
      />
      <PricingForm pricing={row} />
    </div>
  );
}
