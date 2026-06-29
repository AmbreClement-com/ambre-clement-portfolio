import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPricings } from "@/server/db/queries/projects";
import { TarifsCinema } from "@/components/public/tarifs-cinema";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const pricings = await getPublishedPricings().catch(() => []);
  if (pricings.length === 0)
    return buildMetadata({ title: "Tarifs", noIndex: true });
  return buildMetadata({
    title: "Tarifs",
    path: "/tarifs",
    description: pricings[0].subtitle ?? pricings[0].title,
  });
}

export default async function PricingPage() {
  const pricings = await getPublishedPricings().catch(() => []);
  // Onglet publiable : sans aucun tarif publié, la page n'existe pas publiquement.
  if (pricings.length === 0) notFound();

  return <TarifsCinema pricings={pricings} />;
}
