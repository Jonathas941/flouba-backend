import { z } from 'zod';

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    throw new Error(`Invalid boolean value: ${value}`);
  });

const csvOrigins = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .refine((origins) => origins.length > 0, {
    message: 'ALLOWED_ORIGINS must contain at least one origin',
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  BASE44_API_KEY: z.string().min(32),
  MT5_ROBOT_API_KEY: z.string().min(32),
  INTERNAL_ADMIN_API_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z
    .string()
    .min(64)
    .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be a hex string')
    .refine((value) => value.length === 64, {
      message: 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
    }),
  BASE44_HMAC_SECRET: z.string().min(32).optional(),
  ALLOWED_ORIGINS: csvOrigins,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_VERSION: z.string().min(1).default('1.0.0'),
  ROBOT_HEARTBEAT_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(300).default(10),
  ROBOT_OFFLINE_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(600).default(30),
  COMMAND_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(60).default(3),
  COMMAND_EXPIRATION_SECONDS: z.coerce.number().int().min(30).max(86400).default(300),
  MAX_COMMAND_RETRY_COUNT: z.coerce.number().int().min(0).max(20).default(3),
  DEFAULT_MAX_DAILY_LOSS_PERCENT: z.coerce.number().positive().max(100).default(5),
  DEFAULT_MAX_DRAWDOWN_PERCENT: z.coerce.number().positive().max(100).default(10),
  DEFAULT_MAX_OPEN_POSITIONS: z.coerce.number().int().min(1).max(1000).default(10),
  DEFAULT_MAX_LOT_SIZE: z.coerce.number().positive().max(1000).default(1),
  DEFAULT_MIN_FREE_MARGIN: z.coerce.number().min(0).default(100),
  ENABLE_WEBSOCKET: booleanFromString.default(true),
  TRUST_PROXY: booleanFromString.default(false),
  REQUEST_TIMESTAMP_TOLERANCE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  API_REQUEST_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(180).default(14),
  HEARTBEAT_HISTORY_RETENTION_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  JOB_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(3600).default(15),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  ENABLE_HMAC_VALIDATION: booleanFromString.default(false),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return loadEnv();
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export { envSchema };
