import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  PORT: z.coerce.number().int().positive().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const databaseUrl = new URL(parsed.data.DATABASE_URL);

if (!["mysql:", "mysql2:"].includes(databaseUrl.protocol)) {
  throw new Error(
    "DATABASE_URL must be a MySQL connection URL beginning with mysql://",
  );
}

export const env = {
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  port: parsed.data.PORT,
} as const;