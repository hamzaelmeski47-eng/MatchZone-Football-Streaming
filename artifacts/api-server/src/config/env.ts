import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default("mysql://root:@localhost:3306/matchzone"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long")
    .default("matchzone_secure_jwt_secret_token_32chars_min_2026"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_FOOTBALL_KEY: z.string().default(""),
  FOOTBALL_DATA_TOKEN: z.string().default(""),
  // Provider-agnostic Live Stream API integration (SportSRC V2)
  LIVE_STREAM_API_KEY: z.string().default(""),
  LIVE_STREAM_PROVIDER_URL: z.string().default("https://api.sportsrc.org/v2/"),
  // Optional authorized stream servers (must be legitimate provider templates or empty)
  // Format: "Server Label | URL template | type (embed | hls | dash)"
  STREAM_SERVER_1: z.string().default(""),
  STREAM_SERVER_2: z.string().default(""),
  STREAM_SERVER_3: z.string().default(""),
  STREAM_SERVER_4: z.string().default(""),
  // SMTP Email Verification Configuration
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("MatchZone <no-reply@matchzone.com>"),
  // Resend API (HTTP Port 443 - never blocked by cloud firewalls like Railway)
  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM: z.string().default("MatchZone <onboarding@resend.dev>"),
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
  apiFootballKey: parsed.data.API_FOOTBALL_KEY || process.env.API_FOOTBALL_KEY || "",
  footballDataToken: parsed.data.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_TOKEN || parsed.data.API_FOOTBALL_KEY || "",
  liveStreamApiKey: parsed.data.LIVE_STREAM_API_KEY || process.env.LIVE_STREAM_API_KEY || "",
  liveStreamProviderUrl: parsed.data.LIVE_STREAM_PROVIDER_URL || process.env.LIVE_STREAM_PROVIDER_URL || "https://api.sportsrc.org/v2/",
  streamServers: [] as { id: string; name: string; url: string; type: string }[],
  smtpHost: parsed.data.SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parsed.data.SMTP_PORT || Number(process.env.SMTP_PORT) || 587,
  smtpUser: parsed.data.SMTP_USER || process.env.SMTP_USER || "",
  smtpPass: parsed.data.SMTP_PASS || process.env.SMTP_PASS || "",
  smtpFrom: parsed.data.SMTP_FROM || process.env.SMTP_FROM || "MatchZone <no-reply@matchzone.com>",
  resendApiKey: parsed.data.RESEND_API_KEY || process.env.RESEND_API_KEY || "",
  resendFrom: parsed.data.RESEND_FROM || process.env.RESEND_FROM || "MatchZone <onboarding@resend.dev>",
} as const;