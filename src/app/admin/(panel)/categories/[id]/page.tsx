import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  getCategoryById,
  getCategoryPhotosAdmin,
  getCategoryProjectsAdmin,
} from "@/server/db/queries/projects";
import { PhotoManager } from "@/components/admin/photo-manager";
import { ProjectsTable } from "@/components/admin/projects-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CategoryContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();

  const isPhotos = category.type === "photos";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={category.name}
        backHref="/admin/categories"
        backLabel="Onglets"
        description={
          isPhotos
            ? "Glissez les photos pour les réordonner. Le texte alternatif est requis (SEO)."
            : "Projets de cet onglet (catégorie assignée dans chaque projet)."
        }
        badge={
          <Badge variant="secondary">
            {isPhotos ? "Galerie photos" : "Projets"}
          </Badge>
        }
        actions={
          isPhotos ? undefined : (
            <Button asChild size="sm">
              <Link href="/admin/projects/new">
                <Plus className="size-4" /> Nouveau projet
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isPhotos ? (
            <PhotoManagerSection categoryId={id} />
          ) : (
            <ProjectsSection categoryId={id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function PhotoManagerSection({ categoryId }: { categoryId: string }) {
  const photos = await getCategoryPhotosAdmin(categoryId).catch(() => []);
  return <PhotoManager categoryId={categoryId} initial={photos} />;
}

async function ProjectsSection({ categoryId }: { categoryId: string }) {
  const projects = await getCategoryProjectsAdmin(categoryId).catch(() => []);
  return <ProjectsTable initial={projects} />;
}
