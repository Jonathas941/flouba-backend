import { TradeDirection } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const tradeSchema = z.object({
  brokerDealId: z.string().min(1).max(128), brokerPositionId: z.string().max(128).optional(), brokerTicket: z.string().max(128).optional(),
  symbol: z.string().min(1).max(64), direction: z.nativeEnum(TradeDirection), volume: number.positive(),
  openPrice: number.positive(), closePrice: number.positive(), stopLoss: number.optional(), takeProfit: number.optional(),
  grossProfit: number.default(0), commission: number.default(0), swap: number.default(0), netProfit: number.default(0),
  magicNumber: z.coerce.number().int().optional(), comment: z.string().max(1024).optional(), closeReason: z.string().max(128).optional(),
  openedAt: z.coerce.date().optional(), closedAt: z.coerce.date(),
});
export const tradesSyncSchema = z.array(tradeSchema).max(1000);
export type TradeSyncInput = z.infer<typeof tradesSyncSchema>;
export const parseTradesSync = (input: unknown): TradeSyncInput => tradesSyncSchema.parse(input);
