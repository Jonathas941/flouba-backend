import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
export async function getIdempotencyRecord(scope: string, idempotencyKey: string) {
  const r = await prisma.idempotencyRecord.findUnique({ where: { scope_idempotencyKey: { scope, idempotencyKey } } });
  return r && (!r.expiresAt || r.expiresAt > new Date()) ? r : null;
}
export async function setIdempotencyRecord(scope: string, idempotencyKey: string, data: { requestHash?: string; responseStatus?: number; responseBody?: Prisma.InputJsonValue; expiresAt?: Date }) {
  return prisma.idempotencyRecord.upsert({ where: { scope_idempotencyKey: { scope, idempotencyKey } }, create: { scope, idempotencyKey, ...data }, update: data });
}
