import type { NextAuthConfig } from "next-auth";

/**
 * Configuration de base, compatible Edge runtime (aucune dépendance
 * Node native ni accès DB). Utilisée par le middleware.
 * Le provider Credentials (DB + argon2) est ajouté côté Node dans index.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { role?: string; firstName?: string | null; lastName?: string | null };
        token.role = u.role;
        token.firstName = u.firstName ?? null;
        token.lastName = u.lastName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.firstName = (token.firstName as string | null) ?? null;
        session.user.lastName = (token.lastName as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
