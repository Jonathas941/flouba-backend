import { prisma } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import * as trades from '../repositories/trade.repository.js';
import { getRobot } from './robot.service.js';
import type { TradeSyncItem } from '../types/trade.types.js';

export async function syncTrades(robotId: string, items: TradeSyncItem[]) {
  await getRobot(robotId);
  if (items.some((t) => t.robotId !== robotId)) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Trade robotId does not match request robotId');
  return trades.syncTrades(robotId, items);
}
export async function listTrades(robotId: string, args: { skip?: number; take?: number } = {}) {
  await getRobot(robotId);
  return prisma.closedTrade.findMany({ where: { robotId }, orderBy: { closedAt: 'desc' }, skip: args.skip, take: args.take });
}
