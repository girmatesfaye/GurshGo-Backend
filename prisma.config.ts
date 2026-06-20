import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/db/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "node -r ts-node/register src/db/seed.ts",
  },
});
