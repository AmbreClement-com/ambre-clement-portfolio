import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      firstName?: string | null;
      lastName?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}
