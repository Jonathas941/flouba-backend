import { RiskStatus, RobotStatus } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const heartbeatSchema = z.object({
  robotStatus: z.nativeEnum(RobotStatus).default(RobotStatus.ONLINE),
  autoTradingEnabled: z.boolean().default(false),
  terminalConnected: z.boolean().default(false),
  brokerConnected: z.boolean().default(false),
  marketConnected: z.boolean().default(false),
  lastTickTime: z.coerce.date().optional(),
  lastTradeTime: z.coerce.date().optional(),
  lastCommandTime: z.coerce.date().optional(),
  balance: number.default(0), equity: number.default(0), margin: number.default(0), freeMargin: number.default(0), marginLevel: number.default(0),
  floatingProfit: number.default(0), dailyProfit: number.default(0), dailyLoss: number.default(0), dailyNetProfit: number.default(0), drawdownPercent: number.default(0),
  maxDrawdownPercent: number.optional(), openPositionCount: z.coerce.number().int().min(0).default(0),
  pendingOrderCount: z.coerce.number().int().min(0).default(0), currentSpread: number.optional(), averageSpread: number.optional(),
  currentSymbol: z.string().max(64).optional(), tradingSession: z.string().max(128).optional(),
  sessionAllowed: z.boolean().default(true), newsFilterActive: z.boolean().default(false),
  spreadFilterPassed: z.boolean().default(true), riskStatus: z.nativeEnum(RiskStatus).default(RiskStatus.UNKNOWN),
  eaVersion: z.string().max(128).optional(), terminalVersion: z.string().max(128).optional(),
  clientTimestamp: z.coerce.date().optional(),
  emaValue: number.optional(),
  ema20Value: number.optional(),
  ema200Value: number.optional(),
  emaM15Value: number.optional(),
  rsiValue: number.optional(),
  adxValue: number.optional(),
  plusDI: number.optional(),
  minusDI: number.optional(),
  atrValue: number.optional(),
  signalScore: number.optional(),
  lastSignal: z.string().max(64).optional(),
});
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export const parseHeartbeat = (input: unknown): HeartbeatInput => heartbeatSchema.parse(input);
