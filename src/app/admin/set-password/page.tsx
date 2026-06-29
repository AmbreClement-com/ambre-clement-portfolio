import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { SetPasswordForm } from "@/components/admin/set-password-form";

export const metadata = { title: "Activer mon compte", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = token
    ? await db.query.users
        .findFirst({ where: eq(users.inviteToken, token) })
        .catch(() => null)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {user ? (
          <>
            <h1 className="mb-2 text-center text-xl font-semibold">
              Bienvenue{user.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Choisissez votre mot de passe pour activer le compte{" "}
              <span className="font-medium text-foreground">{user.email}</span>.
            </p>
            <SetPasswordForm token={token!} />
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center text-xl font-semibold">
              Lien invalide
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Ce lien d&apos;invitation est invalide ou a déjà été utilisé.
              Demandez à un administrateur de vous en générer un nouveau.
            </p>
            <p className="text-center text-sm">
              <Link href="/admin/login" className="underline">
                Aller à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
