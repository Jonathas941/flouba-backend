import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export async function upsertSync(robotId: string, data: Omit<Prisma.TradingAccountUncheckedCreateInput, 'robotId'>) {
  return prisma.tradingAccount.upsert({
    where: { robotId },
    create: { ...data, robotId, lastSyncedAt: new Date() },
    update: { ...data, lastSyncedAt: new Date() },
  });
}
export async function findByRobotId(robotId: string) {
  return prisma.tradingAccount.findUnique({ where: { robotId } });
}
