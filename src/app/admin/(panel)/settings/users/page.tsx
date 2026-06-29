import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { PageHeader } from "@/components/admin/page-header";
import { UsersManager, type AdminUser } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilisateurs", robots: { index: false } };

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  // Réservé aux administrateurs.
  if (session.user.role !== "admin") redirect("/admin/settings");

  const me = await db.query.users.findFirst({
    where: eq(users.email, session.user.email!),
  });

  const rows = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });

  const list: AdminUser[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.passwordHash !== null,
    inviteToken: u.inviteToken,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Utilisateurs"
        description="Créez des comptes et gérez les droits d'accès au back-office."
        backHref="/admin/settings"
        backLabel="Réglages"
      />
      <UsersManager users={list} currentUserId={me?.id ?? ""} />
    </div>
  );
}
