import { AccountType } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const accountSyncSchema = z.object({
  brokerName: z.string().max(256).optional(), brokerServer: z.string().max(256).optional(),
  accountCurrency: z.string().length(3).optional(), leverage: z.coerce.number().int().positive().optional(),
  accountType: z.nativeEnum(AccountType).optional(), balance: number.default(0), equity: number.default(0), margin: number.default(0),
  freeMargin: number.default(0), marginLevel: number.default(0), floatingProfit: number.default(0), dailyProfit: number.default(0), dailyLoss: number.default(0),
  dailyNetProfit: number.default(0), drawdownPercent: number.default(0), maxDrawdownPercent: number.default(0),
  autoTradingEnabled: z.boolean().default(false), terminalConnected: z.boolean().default(false), brokerConnected: z.boolean().default(false), enabled: z.boolean().default(true),
});
export type AccountSyncInput = z.infer<typeof accountSyncSchema>;
export const parseAccountSync = (input: unknown): AccountSyncInput => accountSyncSchema.parse(input);
