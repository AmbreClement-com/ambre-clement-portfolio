import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { PageHeader } from "@/components/admin/page-header";
import { DevTools } from "@/components/admin/dev-tools";
import { devStats } from "@/server/actions/dev";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Développeur", robots: { index: false } };

export default async function DevPage() {
  // Indisponible en production : la page n'existe tout simplement pas.
  if (process.env.NODE_ENV === "production") notFound();

  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (session.user.role !== "admin") redirect("/admin/settings");

  const stats = await devStats();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Développeur"
        description="Outils réservés à l'environnement de développement."
        backHref="/admin/settings"
        backLabel="Réglages"
        badge={<Badge variant="outline">dev</Badge>}
      />
      <DevTools stats={stats} />
    </div>
  );
}
