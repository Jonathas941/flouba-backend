import { prisma } from '../config/database.js';
export async function expireStaleCommands() {
  return prisma.$transaction(async (tx) => {
    const commands = await tx.tradeCommand.findMany({ where: { status: { in: ['QUEUED', 'DELIVERED', 'ACKNOWLEDGED'] }, expiresAt: { lte: new Date() } }, select: { commandId: true, status: true } });
    if (commands.length) {
      await tx.tradeCommand.updateMany({ where: { commandId: { in: commands.map((c) => c.commandId) } }, data: { status: 'EXPIRED' } });
      await tx.tradeCommandStatusHistory.createMany({ data: commands.map((c) => ({ commandId: c.commandId, fromStatus: c.status, toStatus: 'EXPIRED' as const, message: 'Command expiration reached' })) });
    }
    return commands.length;
  });
}
