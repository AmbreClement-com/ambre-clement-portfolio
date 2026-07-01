import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Toaster } from "@/components/ui/sonner";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { WelcomeOverlay } from "@/components/admin/welcome-overlay";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { isThemeKey } from "@/lib/themes";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cats, projs, tarifs] = await Promise.all([
    auth(),
    db.query.categories
      .findMany({ orderBy: (c, { asc }) => [asc(c.displayOrder)] })
      .catch(() => []),
    db.query.projects
      .findMany({
        columns: { id: true, title: true, categoryId: true },
        orderBy: (p, { asc }) => [asc(p.displayOrder)],
      })
      .catch(() => []),
    db.query.pricings
      .findMany({
        columns: { id: true, title: true },
        orderBy: (p, { asc }) => [asc(p.displayOrder)],
      })
      .catch(() => []),
  ]);

  // Garde d'accès : toute route sous (panel) exige une session admin valide.
  // Point de passage unique → protège l'ensemble du back-office d'un seul coup.
  if (!session?.user) {
    redirect("/admin/login");
  }

  // Thème PROPRE À L'UTILISATEUR connecté (lu frais à chaque rendu admin).
  const me = session.user.email
    ? await db.query.users
        .findFirst({
          where: eq(users.email, session.user.email),
          columns: { theme: true },
        })
        .catch(() => null)
    : null;
  const firstName = session.user.firstName ?? null;
  const theme = isThemeKey(me?.theme) ? me.theme : "default";

  const navProps = {
    role: session.user.role,
    isDev: process.env.NODE_ENV !== "production",
    categories: cats.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    projects: projs.map((p) => ({
      id: p.id,
      title: p.title,
      categoryId: p.categoryId,
    })),
    tarifs: tarifs.map((t) => ({ id: t.id, title: t.title })),
  };

  return (
    <div
      id="admin-root"
      data-theme={theme}
      className="flex min-h-screen flex-col bg-background text-foreground md:flex-row"
    >
      {/* Mobile (< md) : barre + tiroir. Tablette/desktop : masqué au profit de la sidebar. */}
      <AdminMobileNav {...navProps} />

      {/* Tablette/desktop (md+) : sidebar fixe (comportement d'origine). */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-card p-4 md:flex">
        <p className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold tracking-wide">
          <span className="size-2 rounded-full bg-primary" />
          Administration
        </p>
        <AdminNav {...navProps} />
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-28 md:p-8 md:pb-28">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <Toaster />
      <AdminToolbar />
      <WelcomeOverlay firstName={firstName} />
    </div>
  );
}
