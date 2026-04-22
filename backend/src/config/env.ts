import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // ─── Database ────────────────────────────────
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // ─── Redis ───────────────────────────────────
  REDIS_URL: z
    .string()
    .url("REDIS_URL must be a valid Redis connection URL")
    .default("redis://localhost:6379"),

  // ─── Authentication ──────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  // ─── AI ──────────────────────────────────────
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, "ANTHROPIC_API_KEY is required"),

  // ─── Vendor Search ───────────────────────────
  FOURSQUARE_API_KEY: z
    .string()
    .min(1, "FOURSQUARE_API_KEY is required"),

  // ─── Email ───────────────────────────────────
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY is required"),

  // ─── Cloudflare R2 ──────────────────────────
  CLOUDFLARE_R2_ENDPOINT: z
    .string()
    .url("CLOUDFLARE_R2_ENDPOINT must be a valid URL"),
  CLOUDFLARE_R2_BUCKET: z
    .string()
    .min(1, "CLOUDFLARE_R2_BUCKET is required"),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z
    .string()
    .min(1, "CLOUDFLARE_R2_ACCESS_KEY_ID is required"),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "CLOUDFLARE_R2_SECRET_ACCESS_KEY is required"),
  CLOUDFLARE_R2_PUBLIC_URL: z
    .string()
    .url("CLOUDFLARE_R2_PUBLIC_URL must be a valid URL"),

  // ─── Application ────────────────────────────
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:3000"),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error("──────────────────────────────────────────");
    console.error("  Invalid environment variables:");
    console.error("──────────────────────────────────────────");

    for (const [key, messages] of Object.entries(errors)) {
      console.error(`  ${key}: ${messages?.join(", ")}`);
    }

    console.error("──────────────────────────────────────────");
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
