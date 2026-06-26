import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getCategoryBySlug,
  getFirstCategory,
  getNavCategories,
} from "@/server/db/queries/projects";
import { CategoryView } from "@/components/public/category-view";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const [cats, first] = await Promise.all([
    getNavCategories().catch(() => []),
    getFirstCategory().catch(() => null),
  ]);
  // La 1ʳᵉ catégorie est servie par "/" — on ne la duplique pas ici.
  return cats.filter((c) => c.id !== first?.id).map((c) => ({ slug: c.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) return buildMetadata({ title: "Page introuvable", noIndex: true });
  return buildMetadata({ title: category.name, path: `/${category.slug}` });
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const first = await getFirstCategory().catch(() => null);
  if (first && slug === first.slug) redirect("/"); // évite le contenu dupliqué

  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) notFound();

  return <CategoryView category={category} />;
}
