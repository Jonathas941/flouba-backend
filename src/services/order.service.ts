import { prisma } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import * as orders from '../repositories/order.repository.js';
import { getRobot } from './robot.service.js';
import type { OrderSyncItem } from '../types/trade.types.js';

export async function syncOrders(robotId: string, items: OrderSyncItem[]) {
  await getRobot(robotId);
  if (items.some((o) => o.robotId !== robotId)) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Order robotId does not match request robotId');
  return orders.syncOrders(robotId, items);
}
export async function listOrders(robotId: string, includeStale = false) {
  await getRobot(robotId);
  return prisma.pendingOrder.findMany({ where: { robotId, ...(includeStale ? {} : { status: 'PENDING' }) }, orderBy: { orderCreatedAt: 'desc' } });
}
