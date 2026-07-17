import { ENTRY_COMMAND_TYPES, RISK_REJECTION_CODES, STALE_MARKET_DATA_SECONDS } from '../config/constants.js';
import { toNumber } from '../utils/numeric.js';
import { prisma } from '../config/database.js';
import type { CreateCommandInput } from '../types/command.types.js';

export type RiskDecision = { allowed: true } | { allowed: false; code: string; message: string; details?: Record<string, unknown> };
const reject = (code: string, message: string, details?: Record<string, unknown>): RiskDecision => ({ allowed: false, code, message, details });
const entries = new Set<string>(ENTRY_COMMAND_TYPES);

export async function validateCommand(input: CreateCommandInput): Promise<RiskDecision> {
  const robot = await prisma.robot.findUnique({ where: { robotId: input.robotId }, include: { tradingAccount: true, settings: true } });
  if (!robot) return reject(RISK_REJECTION_CODES.ROBOT_NOT_FOUND, 'Robot does not exist');
  const isEntry = entries.has(input.commandType);
  if (!isEntry) return { allowed: true };
  if (robot.emergencyStopActive) return reject(RISK_REJECTION_CODES.EMERGENCY_STOP_ACTIVE, 'Emergency stop is active');
  if (robot.status === 'PAUSED') return reject(RISK_REJECTION_CODES.ROBOT_PAUSED, 'Robot is paused');
  if (robot.status === 'STOPPED') return reject(RISK_REJECTION_CODES.ROBOT_STOPPED, 'Robot is stopped');
  if (robot.status !== 'ONLINE') return reject(RISK_REJECTION_CODES.ROBOT_OFFLINE, 'Robot is not online');
  if (!robot.terminalConnected) return reject(RISK_REJECTION_CODES.TERMINAL_DISCONNECTED, 'Terminal is disconnected');
  if (!robot.brokerConnected) return reject(RISK_REJECTION_CODES.BROKER_DISCONNECTED, 'Broker is disconnected');
  const account = robot.tradingAccount;
  if (!account) return reject(RISK_REJECTION_CODES.ACCOUNT_NOT_FOUND, 'Trading account is unavailable');
  if (!account.enabled) return reject(RISK_REJECTION_CODES.ACCOUNT_DISABLED, 'Trading account is disabled');
  if (!robot.autoTradingEnabled || !account.autoTradingEnabled) return reject(RISK_REJECTION_CODES.AUTOTRADING_DISABLED, 'Auto trading is disabled');
  const s = robot.settings;
  if (!s) return reject(RISK_REJECTION_CODES.ACCOUNT_NOT_FOUND, 'Robot settings are unavailable');
  if (input.symbol && s.blockedSymbols.includes(input.symbol)) return reject(RISK_REJECTION_CODES.SYMBOL_BLOCKED, 'Symbol is blocked');
  if (input.symbol && s.allowedSymbols.length > 0 && !s.allowedSymbols.includes(input.symbol)) return reject(RISK_REJECTION_CODES.SYMBOL_NOT_ALLOWED, 'Symbol is not allowed');
  if (!input.direction) return reject(RISK_REJECTION_CODES.INVALID_DIRECTION, 'Entry command requires direction');
  if (!input.lotSize || input.lotSize < toNumber(s.minimumLotSize)) return reject(RISK_REJECTION_CODES.LOT_TOO_SMALL, 'Lot size below minimum');
  if (input.lotSize > toNumber(s.maximumLotSize)) return reject(RISK_REJECTION_CODES.LOT_TOO_LARGE, 'Lot size above maximum');
  if (input.riskPercent != null && input.riskPercent > toNumber(s.maximumRiskPercent)) return reject(RISK_REJECTION_CODES.RISK_PERCENT_TOO_HIGH, 'Risk percent exceeds limit');
  if (s.requireStopLoss && input.stopLoss == null) return reject(RISK_REJECTION_CODES.STOP_LOSS_REQUIRED, 'Stop loss is required');
  if (input.entryPrice != null && input.stopLoss != null && ((input.direction === 'BUY' && input.stopLoss >= input.entryPrice) || (input.direction === 'SELL' && input.stopLoss <= input.entryPrice))) return reject(RISK_REJECTION_CODES.INVALID_STOP_DISTANCE, 'Stop loss is on invalid side of entry');
  if (input.entryPrice != null && input.takeProfit != null && ((input.direction === 'BUY' && input.takeProfit <= input.entryPrice) || (input.direction === 'SELL' && input.takeProfit >= input.entryPrice))) return reject(RISK_REJECTION_CODES.INVALID_TAKE_PROFIT_DISTANCE, 'Take profit is on invalid side of entry');
  if (input.entryPrice != null && input.stopLoss != null && input.takeProfit != null && s.minimumRewardRiskRatio && Math.abs(input.takeProfit - input.entryPrice) / Math.abs(input.entryPrice - input.stopLoss) < toNumber(s.minimumRewardRiskRatio)) return reject(RISK_REJECTION_CODES.REWARD_RISK_TOO_LOW, 'Reward/risk ratio below minimum');
  const dailyLossLimitReached = s.maximumDailyLossAmount != null
    ? toNumber(account.dailyLoss) >= toNumber(s.maximumDailyLossAmount)
    : toNumber(account.balance) > 0 && (toNumber(account.dailyLoss) / toNumber(account.balance)) * 100 >= toNumber(s.maximumDailyLossPercent);
  if (dailyLossLimitReached || toNumber(account.drawdownPercent) >= toNumber(s.maximumDrawdownPercent)) return reject(toNumber(account.drawdownPercent) >= toNumber(s.maximumDrawdownPercent) ? RISK_REJECTION_CODES.DRAWDOWN_LIMIT_REACHED : RISK_REJECTION_CODES.DAILY_LOSS_LIMIT_REACHED, 'Loss limit reached');
  if (toNumber(account.freeMargin) < toNumber(s.minimumFreeMargin)) return reject(RISK_REJECTION_CODES.FREE_MARGIN_TOO_LOW, 'Free margin too low');
  if (toNumber(account.marginLevel) < toNumber(s.minimumMarginLevel)) return reject(RISK_REJECTION_CODES.MARGIN_LEVEL_TOO_LOW, 'Margin level too low');
  const hb = await prisma.robotHeartbeat.findFirst({ where: { robotId: input.robotId }, orderBy: { receivedAt: 'desc' } });
  if (!hb || Date.now() - hb.receivedAt.getTime() > STALE_MARKET_DATA_SECONDS * 1000) return reject(RISK_REJECTION_CODES.STALE_MARKET_DATA, 'Market data is stale');
  if (!hb.sessionAllowed) return reject(RISK_REJECTION_CODES.SESSION_NOT_ALLOWED, 'Trading session is not allowed');
  if (hb.newsFilterActive) return reject(RISK_REJECTION_CODES.NEWS_FILTER_BLOCKED, 'News filter is active');
  if (!hb.spreadFilterPassed || (s.maximumSpreadPoints && hb.currentSpread && toNumber(hb.currentSpread) > toNumber(s.maximumSpreadPoints))) return reject(RISK_REJECTION_CODES.SPREAD_TOO_HIGH, 'Spread exceeds configured maximum');
  const total = await prisma.openPosition.count({ where: { robotId: input.robotId, status: 'OPEN' } });
  if (total >= s.maximumOpenPositions) return reject(RISK_REJECTION_CODES.MAX_OPEN_POSITIONS_REACHED, 'Maximum open positions reached');
  if (input.symbol && await prisma.openPosition.count({ where: { robotId: input.robotId, symbol: input.symbol, status: 'OPEN' } }) >= s.maximumPositionsPerSymbol) return reject(RISK_REJECTION_CODES.MAX_SYMBOL_POSITIONS_REACHED, 'Maximum positions for symbol reached');
  return { allowed: true };
}
