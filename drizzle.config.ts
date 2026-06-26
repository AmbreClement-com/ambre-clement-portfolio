import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

// Neon en production ; PGlite (local, sur disque) si DATABASE_URL absent.
export default url
  ? defineConfig({
      schema: "./src/server/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: { url },
      verbose: true,
      strict: true,
    })
  : defineConfig({
      schema: "./src/server/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      driver: "pglite",
      dbCredentials: { url: ".pglite" },
      verbose: true,
      strict: true,
    });
