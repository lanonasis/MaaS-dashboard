import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  throw new Error("DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  },
});
