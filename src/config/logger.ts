import pino from 'pino';
import { getEnv } from './env.js';
import { sanitizeForLog } from '../security/sanitize.js';

export function createLogger() {
  const env = getEnv();
  const isDev = env.NODE_ENV === 'development';

  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: 'flouba-lite-backend',
      version: env.APP_VERSION,
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        'req.headers["x-robot-api-key"]',
        'req.headers["x-internal-api-key"]',
        'req.headers["x-signature"]',
        'apiKey',
        'password',
        'token',
        'secret',
        'DATABASE_URL',
        'encryptionKey',
      ],
      censor: '[REDACTED]',
    },
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;

let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

export function resetLogger(): void {
  loggerInstance = null;
}

export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context: Record<string, unknown> = {},
): void {
  getLogger()[level](sanitizeForLog(context), message);
}
