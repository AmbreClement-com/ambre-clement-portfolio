import { redirect } from "next/navigation";
import { getProjectCategories } from "@/server/db/queries/projects";
import { ProjectForm } from "@/components/admin/project-form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>;
}) {
  const { categoryId: requested } = await searchParams;
  const categories = await getProjectCategories().catch(() => []);
  // Sans onglet de type « projets », impossible de créer un projet → on renvoie créer
  // un onglet d'abord (un projet appartient TOUJOURS à un onglet).
  if (categories.length === 0) redirect("/admin/categories");

  // L'onglet est déterminé par le CONTEXTE (param `categoryId`) ; à défaut, le 1er
  // onglet « projets ». Plus de choix manuel, donc plus de projet orphelin.
  const category = categories.find((c) => c.id === requested) ?? categories[0];

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Nouveau projet"
        description={`Onglet : ${category.name}`}
        backHref={`/admin/categories/${category.id}`}
      />
      <Card>
        <CardContent className="pt-6">
          <ProjectForm categoryId={category.id} />
        </CardContent>
      </Card>
    </div>
  );
}
