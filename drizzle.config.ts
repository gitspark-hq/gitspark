import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations go through the session pooler (5432); the app uses the transaction pooler (6543).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
