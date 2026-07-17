import { z } from 'zod';

const number = z.coerce.number().finite();
export const settingsUpdateSchema = z.object({
  autoTradingEnabled: z.boolean().optional(), allowedSymbols: z.array(z.string().min(1)).max(500).optional(),
  blockedSymbols: z.array(z.string().min(1)).max(500).optional(), maximumLotSize: number.positive().optional(),
  minimumLotSize: number.positive().optional(), defaultRiskPercent: number.min(0).max(100).optional(),
  maximumRiskPercent: number.min(0).max(100).optional(), maximumOpenPositions: z.coerce.number().int().positive().optional(),
  maximumPositionsPerSymbol: z.coerce.number().int().positive().optional(), maximumDailyLossAmount: number.min(0).nullable().optional(),
  maximumDailyLossPercent: number.min(0).max(100).optional(), dailyProfitTargetAmount: number.min(0).nullable().optional(),
  dailyProfitTargetPercent: number.min(0).max(100).nullable().optional(), maximumDrawdownPercent: number.min(0).max(100).optional(),
  minimumFreeMargin: number.min(0).optional(), minimumMarginLevel: number.min(0).optional(), maximumSpreadPoints: number.min(0).nullable().optional(),
  requireStopLoss: z.boolean().optional(), minimumRewardRiskRatio: number.positive().nullable().optional(),
  allowedTradingSessions: z.array(z.string().min(1)).max(100).optional(), newsFilterEnabled: z.boolean().optional(),
  trailingStopEnabled: z.boolean().optional(), breakEvenEnabled: z.boolean().optional(), partialCloseEnabled: z.boolean().optional(),
  commandExpirationSeconds: z.coerce.number().int().positive().optional(), heartbeatTimeoutSeconds: z.coerce.number().int().positive().optional(),
  martingaleEnabled: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one setting is required');
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export const parseSettingsUpdate = (input: unknown): SettingsUpdateInput => settingsUpdateSchema.parse(input);
