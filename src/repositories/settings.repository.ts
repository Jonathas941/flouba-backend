import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { decimalOrZero } from '../utils/numeric.js';

export async function getOrCreateDefaults(robotId: string) {
  const env = getEnv();
  return prisma.robotSettings.upsert({
    where: { robotId },
    create: { robotId, maximumLotSize: decimalOrZero(env.DEFAULT_MAX_LOT_SIZE), maximumDailyLossPercent: decimalOrZero(env.DEFAULT_MAX_DAILY_LOSS_PERCENT), maximumDrawdownPercent: decimalOrZero(env.DEFAULT_MAX_DRAWDOWN_PERCENT), maximumOpenPositions: env.DEFAULT_MAX_OPEN_POSITIONS, minimumFreeMargin: decimalOrZero(env.DEFAULT_MIN_FREE_MARGIN), heartbeatTimeoutSeconds: env.ROBOT_OFFLINE_TIMEOUT_SECONDS, commandExpirationSeconds: env.COMMAND_EXPIRATION_SECONDS, martingaleEnabled: false },
    update: {},
  });
}
export async function updateSettings(robotId: string, data: Prisma.RobotSettingsUpdateInput) {
  return prisma.robotSettings.update({ where: { robotId }, data });
}
export async function appendHistory(robotId: string, previousValues: Prisma.InputJsonValue, newValues: Prisma.InputJsonValue, changedBy?: string, changeSource = 'API') {
  return prisma.robotSettingsHistory.create({ data: { robotId, previousValues, newValues, changedBy, changeSource } });
}
