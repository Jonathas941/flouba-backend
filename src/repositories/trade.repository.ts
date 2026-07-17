import { prisma } from '../config/database.js';
import { decimalOrZero } from '../utils/numeric.js';
import type { TradeSyncItem } from '../types/trade.types.js';

export async function syncTrades(robotId: string, trades: TradeSyncItem[]) {
  return prisma.$transaction(async (tx) => {
    for (const t of trades) {
      const data = { accountLogin: t.accountLogin, brokerPositionId: t.brokerPositionId, brokerTicket: t.brokerTicket, symbol: t.symbol, direction: t.direction, volume: decimalOrZero(t.volume), openPrice: decimalOrZero(t.openPrice), closePrice: decimalOrZero(t.closePrice), stopLoss: t.stopLoss == null ? null : decimalOrZero(t.stopLoss), takeProfit: t.takeProfit == null ? null : decimalOrZero(t.takeProfit), grossProfit: decimalOrZero(t.grossProfit), commission: decimalOrZero(t.commission), swap: decimalOrZero(t.swap), netProfit: decimalOrZero(t.netProfit), magicNumber: t.magicNumber, comment: t.comment, openedAt: t.openedAt ? new Date(t.openedAt) : null, closedAt: new Date(t.closedAt), closeReason: t.closeReason };
      await tx.closedTrade.upsert({ where: { robotId_brokerDealId: { robotId, brokerDealId: t.brokerDealId } }, create: { ...data, robotId, brokerDealId: t.brokerDealId }, update: data });
    }
    return { synced: trades.length };
  });
}
