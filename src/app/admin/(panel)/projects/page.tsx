import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllProjects } from "@/server/db/queries/projects";
import { ProjectsTable } from "@/components/admin/projects-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await getAllProjects().catch(() => []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projets"
        description="Glissez les lignes pour réordonner l'affichage sur le site."
        actions={
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="size-4" /> Nouveau projet
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <ProjectsTable initial={projects} />
        </CardContent>
      </Card>
    </div>
  );
}
