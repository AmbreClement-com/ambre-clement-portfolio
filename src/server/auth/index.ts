import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { authConfig } from "./config";
import { allowAttempt, recordFailure, resetAttempts } from "./rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Anti brute-force : verrou après trop d'échecs
        if (!allowAttempt(email)) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) {
          recordFailure(email);
          return null;
        }

        const ok = await verify(user.passwordHash, password);
        if (!ok) {
          recordFailure(email);
          return null;
        }

        resetAttempts(email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
      },
    }),
  ],
});
