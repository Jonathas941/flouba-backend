import { PositionStatus, TradeDirection } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const positionSchema = z.object({
  brokerPositionId: z.string().min(1).max(128), brokerTicket: z.string().max(128).optional(),
  symbol: z.string().min(1).max(64), direction: z.nativeEnum(TradeDirection), volume: number.positive(),
  openPrice: number.positive(), currentPrice: number.optional(), stopLoss: number.optional(), takeProfit: number.optional(),
  profit: number.default(0), swap: number.default(0), commission: number.default(0), magicNumber: z.coerce.number().int().optional(),
  comment: z.string().max(1024).optional(), status: z.nativeEnum(PositionStatus).default(PositionStatus.OPEN),
  openedAt: z.coerce.date().optional(), closedAt: z.coerce.date().optional(),
});
export const positionsSyncSchema = z.array(positionSchema).max(500);
export type PositionSyncInput = z.infer<typeof positionsSyncSchema>;
export const parsePositionsSync = (input: unknown): PositionSyncInput => positionsSyncSchema.parse(input);
