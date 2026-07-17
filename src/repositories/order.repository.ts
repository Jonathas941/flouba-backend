import { prisma } from '../config/database.js';
import { decimalOrZero } from '../utils/numeric.js';
import type { OrderSyncItem } from '../types/trade.types.js';

export async function syncOrders(robotId: string, orders: OrderSyncItem[]) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ids = orders.map((o) => o.brokerOrderId);
    for (const o of orders) {
      const { updatedAt: _updatedAt, ...order } = o;
      void _updatedAt;
      await tx.pendingOrder.upsert({
        where: { robotId_brokerOrderId: { robotId, brokerOrderId: o.brokerOrderId } },
        create: { ...order, robotId, volume: decimalOrZero(o.volume), requestedPrice: decimalOrZero(o.requestedPrice), stopLoss: o.stopLoss == null ? null : decimalOrZero(o.stopLoss), takeProfit: o.takeProfit == null ? null : decimalOrZero(o.takeProfit), expiration: o.expiration ? new Date(o.expiration) : null, orderCreatedAt: o.createdAt ? new Date(o.createdAt) : null, status: 'PENDING', lastSyncedAt: now },
        update: { brokerTicket: o.brokerTicket, accountLogin: o.accountLogin, symbol: o.symbol, orderType: o.orderType, volume: decimalOrZero(o.volume), requestedPrice: decimalOrZero(o.requestedPrice), stopLoss: o.stopLoss == null ? null : decimalOrZero(o.stopLoss), takeProfit: o.takeProfit == null ? null : decimalOrZero(o.takeProfit), expiration: o.expiration ? new Date(o.expiration) : null, magicNumber: o.magicNumber, comment: o.comment, status: 'PENDING', lastSyncedAt: now },
      });
    }
    const stale = await tx.pendingOrder.updateMany({ where: { robotId, status: 'PENDING', ...(ids.length ? { brokerOrderId: { notIn: ids } } : {}) }, data: { status: 'STALE', lastSyncedAt: now } });
    return { synced: orders.length, stale: stale.count };
  });
}
