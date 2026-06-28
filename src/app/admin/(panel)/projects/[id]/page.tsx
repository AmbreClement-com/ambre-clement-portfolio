import { notFound } from "next/navigation";
import { getProjectById } from "@/server/db/queries/projects";
import { ProjectForm } from "@/components/admin/project-form";
import { PhotoManager } from "@/components/admin/photo-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader
        title={project.title}
        backHref="/admin/categories"
        actions={
          project.published && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/projects/${project.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir la page ↗
              </a>
            </Button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm project={project} categoryId={project.categoryId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Galerie</CardTitle>
            <CardDescription>
              La première photo sert de couverture. Glissez pour réordonner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoManager projectId={project.id} initial={project.photos} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
