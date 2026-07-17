import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config(); // .env — ne remplace pas les variables déjà posées

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL manquant (.env.local) — voir .env.example.");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
