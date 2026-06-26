import { getNavCategories } from "@/server/db/queries/projects";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getNavCategories().catch(() => []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Onglets du site"
        description="Chaque onglet apparaît dans le menu. Choisissez s'il contient des photos ou des projets."
      />
      <Card>
        <CardContent className="pt-6">
          <CategoriesManager initial={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
