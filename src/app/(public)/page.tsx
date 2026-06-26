import type { Metadata } from "next";
import { getFirstCategory } from "@/server/db/queries/projects";
import { CategoryView } from "@/components/public/category-view";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  path: "/",
  description:
    "Portfolio photographique d'Ambre Clément : une sélection de clichés et de projets.",
});

export default async function HomePage() {
  const category = await getFirstCategory().catch(() => null);

  if (!category) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="sr-only">Portfolio — Ambre Clément</h1>
        <p className="py-20 text-center text-neutral-500">
          Le site sera bientôt en ligne.
        </p>
      </div>
    );
  }

  return <CategoryView category={category} />;
}
