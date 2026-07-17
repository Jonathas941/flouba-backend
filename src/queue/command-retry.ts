import { prisma } from '../config/database.js';
export async function retryAbandonedDeliveries(timeoutSeconds = 30) {
  const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.tradeCommand.findMany({ where: { status: 'DELIVERED', deliveredAt: { lt: cutoff } }, select: { commandId: true, status: true, retryCount: true, maximumRetryCount: true } });
    const retry = candidates.filter((command) => command.retryCount < command.maximumRetryCount);
    if (retry.length) {
      await tx.tradeCommand.updateMany({ where: { commandId: { in: retry.map((c) => c.commandId) } }, data: { status: 'QUEUED', deliveredAt: null, deliveryOwner: null, retryCount: { increment: 1 } } });
      await tx.tradeCommandStatusHistory.createMany({ data: retry.map((c) => ({ commandId: c.commandId, fromStatus: c.status, toStatus: 'QUEUED' as const, message: 'Delivery acknowledgement timeout; requeued' })) });
    }
    return retry.length;
  });
}
