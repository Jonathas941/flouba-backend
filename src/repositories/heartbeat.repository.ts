import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export async function createHeartbeat(data: Prisma.RobotHeartbeatUncheckedCreateInput) {
  return prisma.robotHeartbeat.create({ data });
}
export async function countPendingCommands(robotId: string) {
  return prisma.tradeCommand.count({ where: { robotId, status: { in: ['QUEUED', 'DELIVERED', 'ACKNOWLEDGED', 'EXECUTING'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
}
export async function getLatest(robotId: string) {
  return prisma.robotHeartbeat.findFirst({ where: { robotId }, orderBy: { receivedAt: 'desc' } });
}
