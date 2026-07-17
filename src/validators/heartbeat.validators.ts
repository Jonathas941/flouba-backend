import { RiskStatus, RobotStatus } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const heartbeatSchema = z.object({
  robotStatus: z.nativeEnum(RobotStatus),
  autoTradingEnabled: z.boolean(),
  terminalConnected: z.boolean(),
  brokerConnected: z.boolean(),
  marketConnected: z.boolean(),
  lastTickTime: z.coerce.date().optional(),
  lastTradeTime: z.coerce.date().optional(),
  lastCommandTime: z.coerce.date().optional(),
  balance: number, equity: number, margin: number, freeMargin: number, marginLevel: number,
  floatingProfit: number, dailyProfit: number, dailyLoss: number, dailyNetProfit: number, drawdownPercent: number,
  maxDrawdownPercent: number.optional(), openPositionCount: z.coerce.number().int().min(0),
  pendingOrderCount: z.coerce.number().int().min(0), currentSpread: number.optional(), averageSpread: number.optional(),
  currentSymbol: z.string().max(64).optional(), tradingSession: z.string().max(128).optional(),
  sessionAllowed: z.boolean().default(true), newsFilterActive: z.boolean().default(false),
  spreadFilterPassed: z.boolean().default(true), riskStatus: z.nativeEnum(RiskStatus).default(RiskStatus.UNKNOWN),
  eaVersion: z.string().max(128).optional(), terminalVersion: z.string().max(128).optional(),
  clientTimestamp: z.coerce.date().optional(),
  emaValue: number.optional(), ema20Value: number.optional(), ema200Value: number.optional(),
  emaM15Value: number.optional(), rsiValue: number.optional(), adxValue: number.optional(),
  plusDI: number.optional(), minusDI: number.optional(), atrValue: number.optional(),
  signalScore: number.optional(), lastSignal: z.string().max(64).optional(),
});
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export const parseHeartbeat = (input: unknown): HeartbeatInput => heartbeatSchema.parse(input);
