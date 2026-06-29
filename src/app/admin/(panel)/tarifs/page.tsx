import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllPricings } from "@/server/db/queries/projects";
import { PageHeader } from "@/components/admin/page-header";
import { PricingsTable } from "@/components/admin/pricings-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifs", robots: { index: false } };

export default async function TarifsPage() {
  const rows = await getAllPricings().catch(() => []);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tarifs"
        description="Les tarifs publiés s'affichent sur la page Tarifs du site (l'onglet apparaît dès qu'un tarif est publié)."
        actions={
          <Button asChild>
            <Link href="/admin/tarifs/new">
              <Plus className="size-4" /> Nouveau tarif
            </Link>
          </Button>
        }
      />
      <PricingsTable initial={rows} />
    </div>
  );
}
