import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

/** Résout un slug public vers l'éditeur du projet (utilisé par la barre admin). */
export default async function ProjectBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  redirect(project ? `/admin/projects/${project.id}` : "/admin/projects");
}
