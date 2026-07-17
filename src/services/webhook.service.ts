import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
export function enqueueWebhookEvent(eventType: string, payload: Prisma.InputJsonValue, targetUrl?: string) {
  return prisma.webhookEvent.create({ data: { eventType, payload, targetUrl } });
}

export function listWebhookEvents(status?: string) {
  return prisma.webhookEvent.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: 'desc' }, take: 200 });
}

export function getWebhookEvent(id: string) {
  return prisma.webhookEvent.findUnique({ where: { id } });
}
