import type { Prisma } from '@prisma/client';
import { decimalOrZero } from '../utils/numeric.js';
import { getEnv } from '../config/env.js';
import * as heartbeat from '../repositories/heartbeat.repository.js';
import { syncAccount } from './account.service.js';
import { getRobot } from './robot.service.js';

export async function processHeartbeat(input: Prisma.RobotHeartbeatUncheckedCreateInput) {
  const robot = await getRobot(input.robotId);
  const now = new Date();
  await heartbeat.createHeartbeat({ ...input, receivedAt: now, balance: decimalOrZero(input.balance), equity: decimalOrZero(input.equity), margin: decimalOrZero(input.margin), freeMargin: decimalOrZero(input.freeMargin), marginLevel: decimalOrZero(input.marginLevel), floatingProfit: decimalOrZero(input.floatingProfit), dailyProfit: decimalOrZero(input.dailyProfit), dailyLoss: decimalOrZero(input.dailyLoss), dailyNetProfit: decimalOrZero(input.dailyNetProfit), drawdownPercent: decimalOrZero(input.drawdownPercent), maxDrawdownPercent: decimalOrZero(input.maxDrawdownPercent) });
  await syncAccount({ robotId: input.robotId, accountLogin: input.accountLogin, balance: Number(input.balance), equity: Number(input.equity), margin: Number(input.margin), freeMargin: Number(input.freeMargin), marginLevel: Number(input.marginLevel), floatingProfit: Number(input.floatingProfit), dailyProfit: Number(input.dailyProfit), dailyLoss: Number(input.dailyLoss), dailyNetProfit: Number(input.dailyNetProfit), drawdownPercent: Number(input.drawdownPercent), maxDrawdownPercent: Number(input.maxDrawdownPercent ?? 0), autoTradingEnabled: input.autoTradingEnabled, terminalConnected: input.terminalConnected, brokerConnected: input.brokerConnected });
  await (await import('../config/database.js')).prisma.robot.update({ where: { robotId: input.robotId }, data: { status: robot.emergencyStopActive ? 'EMERGENCY_STOPPED' : input.robotStatus, autoTradingEnabled: input.autoTradingEnabled, terminalConnected: input.terminalConnected, brokerConnected: input.brokerConnected, marketConnected: input.marketConnected, lastHeartbeatAt: now, lastSeenAt: now } });
  return { robotId: input.robotId, pendingCommandCount: await heartbeat.countPendingCommands(input.robotId), emergencyStopActive: robot.emergencyStopActive, robotStatus: robot.emergencyStopActive ? 'EMERGENCY_STOPPED' : input.robotStatus, configuration: { heartbeatIntervalSeconds: getEnv().ROBOT_HEARTBEAT_INTERVAL_SECONDS, commandPollingIntervalSeconds: getEnv().COMMAND_POLL_INTERVAL_SECONDS, commandExpirationSeconds: robot.settings?.commandExpirationSeconds ?? getEnv().COMMAND_EXPIRATION_SECONDS }, serverTime: now.toISOString() };
}
