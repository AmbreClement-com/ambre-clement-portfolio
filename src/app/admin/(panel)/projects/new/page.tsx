import { getProjectCategories } from "@/server/db/queries/projects";
import { ProjectForm } from "@/components/admin/project-form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const categories = await getProjectCategories().catch(() => []);

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Nouveau projet" backHref="/admin/categories" />
      <Card>
        <CardContent className="pt-6">
          <ProjectForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
