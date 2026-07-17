import { AccountType } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const accountSyncSchema = z.object({
  brokerName: z.string().max(256).optional(), brokerServer: z.string().max(256).optional(),
  accountCurrency: z.string().length(3).optional(), leverage: z.coerce.number().int().positive().optional(),
  accountType: z.nativeEnum(AccountType).optional(), balance: number, equity: number, margin: number,
  freeMargin: number, marginLevel: number, floatingProfit: number, dailyProfit: number, dailyLoss: number,
  dailyNetProfit: number, drawdownPercent: number, maxDrawdownPercent: number,
  autoTradingEnabled: z.boolean(), terminalConnected: z.boolean(), brokerConnected: z.boolean(), enabled: z.boolean().default(true),
});
export type AccountSyncInput = z.infer<typeof accountSyncSchema>;
export const parseAccountSync = (input: unknown): AccountSyncInput => accountSyncSchema.parse(input);
