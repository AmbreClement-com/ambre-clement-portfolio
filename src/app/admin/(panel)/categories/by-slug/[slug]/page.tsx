import { redirect } from "next/navigation";
import { getCategoryBySlug } from "@/server/db/queries/projects";

/** Résout un slug de catégorie public vers sa page de gestion (barre admin). */
export default async function CategoryBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug).catch(() => null);
  redirect(category ? `/admin/categories/${category.id}` : "/admin/categories");
}
