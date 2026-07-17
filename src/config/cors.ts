import type { CorsOptions } from 'cors';
import { getEnv } from './env.js';

export function buildCorsOptions(): CorsOptions {
  const env = getEnv();
  const allowed = new Set(env.ALLOWED_ORIGINS);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin) || allowed.has('*')) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-robot-api-key',
      'x-robot-id',
      'x-account-login',
      'x-request-id',
      'x-timestamp',
      'x-signature',
      'x-idempotency-key',
      'x-internal-api-key',
    ],
    exposedHeaders: ['x-request-id'],
    maxAge: 600,
  };
}
