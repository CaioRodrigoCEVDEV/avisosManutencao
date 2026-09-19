import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatório."),
  JWT_EXPIRES_IN: z.string().default("8h"),
  COOKIE_NAME: z.string().default("maintenance_auth"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
  TRUST_PROXY: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join(", ");
  throw new Error(`Configuração de ambiente inválida -> ${details}`);
}

const raw = parsed.data;

if (raw.NODE_ENV === "production") {
  if (raw.JWT_SECRET === "CHANGE_THIS_SECRET" || raw.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET fraco em produção. Use um segredo com pelo menos 32 caracteres."
    );
  }
}

/**
 * Resolve a configuração de `trust proxy` (necessária atrás de Apache/Nginx).
 * Padrão: `1` em produção, desativado nos demais ambientes.
 * Pode ser sobrescrita pela variável TRUST_PROXY (true/false/número).
 */
function resolveTrustProxy(value: string | undefined, isProduction: boolean): number | boolean | string {
  if (value === undefined || value.trim() === "") {
    return isProduction ? 1 : false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) return numeric;

  return value;
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  jwtSecret: raw.JWT_SECRET,
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  cookieName: raw.COOKIE_NAME,
  corsOrigin: raw.CORS_ORIGIN,
  appTimezone: raw.APP_TIMEZONE,
  trustProxy: resolveTrustProxy(raw.TRUST_PROXY, raw.NODE_ENV === "production"),
  adminName: raw.ADMIN_NAME,
  adminEmail: raw.ADMIN_EMAIL,
  adminPassword: raw.ADMIN_PASSWORD,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
} as const;

export type Env = typeof env;
