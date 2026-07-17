import { prisma } from '../config/database.js';
import { decimalOrZero } from '../utils/numeric.js';
import type { PositionSyncItem } from '../types/trade.types.js';

export async function syncPositions(robotId: string, positions: PositionSyncItem[]) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ids = positions.map((p) => p.brokerPositionId);
    for (const p of positions) {
      const { updatedAt: _updatedAt, ...position } = p;
      void _updatedAt;
      await tx.openPosition.upsert({
        where: { robotId_brokerPositionId: { robotId, brokerPositionId: p.brokerPositionId } },
        create: { ...position, robotId, volume: decimalOrZero(p.volume), openPrice: decimalOrZero(p.openPrice), currentPrice: p.currentPrice == null ? null : decimalOrZero(p.currentPrice), stopLoss: p.stopLoss == null ? null : decimalOrZero(p.stopLoss), takeProfit: p.takeProfit == null ? null : decimalOrZero(p.takeProfit), profit: decimalOrZero(p.profit), swap: decimalOrZero(p.swap), commission: decimalOrZero(p.commission), openedAt: p.openedAt ? new Date(p.openedAt) : null, status: 'OPEN', lastSyncedAt: now },
        update: { brokerTicket: p.brokerTicket, accountLogin: p.accountLogin, symbol: p.symbol, direction: p.direction, volume: decimalOrZero(p.volume), openPrice: decimalOrZero(p.openPrice), currentPrice: p.currentPrice == null ? null : decimalOrZero(p.currentPrice), stopLoss: p.stopLoss == null ? null : decimalOrZero(p.stopLoss), takeProfit: p.takeProfit == null ? null : decimalOrZero(p.takeProfit), profit: decimalOrZero(p.profit), swap: decimalOrZero(p.swap), commission: decimalOrZero(p.commission), magicNumber: p.magicNumber, comment: p.comment, openedAt: p.openedAt ? new Date(p.openedAt) : undefined, status: 'OPEN', lastSyncedAt: now },
      });
    }
    const stale = await tx.openPosition.updateMany({ where: { robotId, status: 'OPEN', ...(ids.length ? { brokerPositionId: { notIn: ids } } : {}) }, data: { status: 'STALE', lastSyncedAt: now } });
    return { synced: positions.length, stale: stale.count };
  });
}
