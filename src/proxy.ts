import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Instance edge-safe (sans DB ni argon2) dédiée au middleware.
const { auth } = NextAuth(authConfig);

/**
 * Protège tout /admin/* sauf la page de connexion.
 * La vérif est aussi refaite dans chaque Server Action (defense in depth).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin && !isLogin && !req.auth) {
    const url = new URL("/admin/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  if (isLogin && req.auth) {
    return Response.redirect(new URL("/admin", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
