import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
export type SocketPrincipal = { role: 'base44' | 'internal'; robotId?: string; exp: number };
const b64 = (v: string) => Buffer.from(v).toString('base64url');
export function signSocketToken(payload: Omit<SocketPrincipal, 'exp'>, ttlSeconds = 300) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = createHmac('sha256', getEnv().JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verifySocketToken(token: string): SocketPrincipal {
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid socket token', 401);
  const expected = createHmac('sha256', getEnv().JWT_SECRET).update(body).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid socket token', 401);
  let payload: SocketPrincipal;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SocketPrincipal; } catch { throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid socket token', 401); }
  if (!['base44', 'internal'].includes(payload.role) || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Expired socket token', 401);
  return payload;
}
