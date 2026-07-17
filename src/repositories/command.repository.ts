import type { CommandStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export async function create(data: Prisma.TradeCommandUncheckedCreateInput) {
  return prisma.tradeCommand.create({ data });
}
export async function findByCommandId(commandId: string) {
  return prisma.tradeCommand.findUnique({ where: { commandId }, include: { statusHistory: { orderBy: { createdAt: 'asc' } } } });
}
export async function findByIdempotency(robotId: string, idempotencyKey: string) {
  return prisma.tradeCommand.findUnique({ where: { robotId_idempotencyKey: { robotId, idempotencyKey } } });
}
export async function listForRobot(robotId: string, args: { skip?: number; take?: number; status?: CommandStatus } = {}) {
  const where: Prisma.TradeCommandWhereInput = { robotId, ...(args.status ? { status: args.status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.tradeCommand.findMany({ where, orderBy: { createdAt: 'desc' }, skip: args.skip, take: args.take }),
    prisma.tradeCommand.count({ where }),
  ]);
  return { items, total };
}
export async function appendStatusHistory(commandId: string, toStatus: CommandStatus, fromStatus?: CommandStatus | null, message?: string, metadata?: Prisma.InputJsonValue) {
  return prisma.tradeCommandStatusHistory.create({ data: { commandId, fromStatus, toStatus, message, metadata } });
}
export async function updateStatus(commandId: string, status: CommandStatus, data: Prisma.TradeCommandUpdateInput = {}, message?: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tradeCommand.findUniqueOrThrow({ where: { commandId } });
    const command = await tx.tradeCommand.update({ where: { commandId }, data: { ...data, status } });
    await tx.tradeCommandStatusHistory.create({ data: { commandId, fromStatus: current.status, toStatus: status, message } });
    return command;
  });
}
export async function atomicDeliver(commandId: string, deliveryOwner: string) {
  const result = await prisma.tradeCommand.updateMany({
    where: { commandId, status: 'QUEUED', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    data: { status: 'DELIVERED', deliveredAt: new Date(), deliveryOwner },
  });
  return result.count === 1 ? prisma.tradeCommand.findUnique({ where: { commandId } }) : null;
}
