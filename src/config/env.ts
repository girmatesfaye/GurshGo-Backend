import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  STRIPE_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
  FCM_KEY: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
