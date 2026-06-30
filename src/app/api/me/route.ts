import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { isThemeKey } from "@/lib/themes";

/** Identité de l'admin connecté, lue en base (toujours à jour). 401 sinon. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(null, { status: 401 });
  }
  const u = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });
  if (!u) return NextResponse.json(null, { status: 401 });

  return NextResponse.json({
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    theme: isThemeKey(u.theme) ? u.theme : "default",
  });
}
