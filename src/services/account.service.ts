import { decimalOrZero, toNumber } from '../utils/numeric.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import * as accounts from '../repositories/account.repository.js';
import { getRobot } from './robot.service.js';
import type { AccountSyncInput, AccountSummary } from '../types/account.types.js';

export async function syncAccount(input: AccountSyncInput) {
  await getRobot(input.robotId);
  return accounts.upsertSync(input.robotId, { accountLogin: input.accountLogin, brokerName: input.brokerName, brokerServer: input.brokerServer, accountCurrency: input.accountCurrency, leverage: input.leverage, balance: decimalOrZero(input.balance), equity: decimalOrZero(input.equity), margin: decimalOrZero(input.margin), freeMargin: decimalOrZero(input.freeMargin), marginLevel: decimalOrZero(input.marginLevel), floatingProfit: decimalOrZero(input.floatingProfit), dailyProfit: decimalOrZero(input.dailyProfit), dailyLoss: decimalOrZero(input.dailyLoss), dailyNetProfit: decimalOrZero(input.dailyNetProfit), drawdownPercent: decimalOrZero(input.drawdownPercent), maxDrawdownPercent: decimalOrZero(input.maxDrawdownPercent), autoTradingEnabled: input.autoTradingEnabled ?? false, terminalConnected: input.terminalConnected ?? false, brokerConnected: input.brokerConnected ?? false });
}
export async function getAccount(robotId: string): Promise<AccountSummary> {
  const a = await accounts.findByRobotId(robotId);
  if (!a) throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND, 'Trading account not found', 404, { robotId });
  return { robotId, accountLogin: a.accountLogin, brokerName: a.brokerName, brokerServer: a.brokerServer, accountCurrency: a.accountCurrency, leverage: a.leverage, balance: toNumber(a.balance), equity: toNumber(a.equity), margin: toNumber(a.margin), freeMargin: toNumber(a.freeMargin), marginLevel: toNumber(a.marginLevel), floatingProfit: toNumber(a.floatingProfit), dailyProfit: toNumber(a.dailyProfit), dailyLoss: toNumber(a.dailyLoss), dailyNetProfit: toNumber(a.dailyNetProfit), drawdownPercent: toNumber(a.drawdownPercent), maxDrawdownPercent: toNumber(a.maxDrawdownPercent), autoTradingEnabled: a.autoTradingEnabled, terminalConnected: a.terminalConnected, brokerConnected: a.brokerConnected, enabled: a.enabled, lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null };
}
