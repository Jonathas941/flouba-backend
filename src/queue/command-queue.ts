import { prisma } from '../config/database.js';
import { toNumber } from '../utils/numeric.js';
import type { CommandDeliveryItem } from '../types/command.types.js';

export async function deliverCommands(robotId: string, deliveryOwner: string, limit = 50): Promise<CommandDeliveryItem[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ commandId: string }[]>`
      SELECT "commandId" FROM "TradeCommand"
      WHERE "robotId" = ${robotId} AND status = 'QUEUED'
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      ORDER BY CASE priority WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'NORMAL' THEN 2 ELSE 1 END DESC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT ${limit}`;
    if (!rows.length) return [];
    const ids = rows.map((r) => r.commandId);
    await tx.tradeCommand.updateMany({ where: { commandId: { in: ids }, status: 'QUEUED' }, data: { status: 'DELIVERED', deliveredAt: new Date(), deliveryOwner } });
    const delivered = await tx.tradeCommand.findMany({ where: { commandId: { in: ids }, status: 'DELIVERED', deliveryOwner }, orderBy: { createdAt: 'asc' } });
    return delivered.map((c) => ({ commandId: c.commandId, commandType: c.commandType, symbol: c.symbol, direction: c.direction, lotSize: c.lotSize == null ? null : toNumber(c.lotSize), riskPercent: c.riskPercent == null ? null : toNumber(c.riskPercent), entryPrice: c.entryPrice == null ? null : toNumber(c.entryPrice), stopLoss: c.stopLoss == null ? null : toNumber(c.stopLoss), takeProfit: c.takeProfit == null ? null : toNumber(c.takeProfit), trailingStopPoints: c.trailingStopPoints == null ? null : toNumber(c.trailingStopPoints), breakEvenTriggerPoints: c.breakEvenTriggerPoints == null ? null : toNumber(c.breakEvenTriggerPoints), partialClosePercent: c.partialClosePercent == null ? null : toNumber(c.partialClosePercent), brokerTicket: c.brokerTicket, brokerPositionId: c.brokerPositionId, brokerOrderId: c.brokerOrderId, magicNumber: c.magicNumber, comment: c.comment, metadata: c.metadata, priority: c.priority, expiresAt: c.expiresAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString() }));
  });
}
