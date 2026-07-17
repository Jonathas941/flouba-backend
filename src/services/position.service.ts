import { prisma } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import * as positions from '../repositories/position.repository.js';
import { getRobot } from './robot.service.js';
import type { PositionSyncItem } from '../types/trade.types.js';

export async function syncPositions(robotId: string, items: PositionSyncItem[]) {
  await getRobot(robotId);
  if (items.some((p) => p.robotId !== robotId)) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Position robotId does not match request robotId');
  return positions.syncPositions(robotId, items);
}
export async function listPositions(robotId: string, includeStale = false) {
  await getRobot(robotId);
  return prisma.openPosition.findMany({ where: { robotId, ...(includeStale ? {} : { status: 'OPEN' }) }, orderBy: { openedAt: 'desc' } });
}
