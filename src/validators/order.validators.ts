import { OrderType, PendingOrderStatus } from '@prisma/client';
import { z } from 'zod';

const number = z.coerce.number().finite();
export const orderSchema = z.object({
  brokerOrderId: z.string().min(1).max(128), brokerTicket: z.string().max(128).optional(),
  symbol: z.string().min(1).max(64), orderType: z.nativeEnum(OrderType), volume: number.positive(),
  requestedPrice: number.positive(), stopLoss: number.nullable().optional(), takeProfit: number.nullable().optional(), expiration: z.coerce.date().nullable().optional(),
  magicNumber: z.coerce.number().int().optional(), comment: z.string().max(1024).optional(),
  status: z.nativeEnum(PendingOrderStatus).default(PendingOrderStatus.PENDING), orderCreatedAt: z.coerce.date().optional(),
});
export const ordersSyncSchema = z.array(orderSchema).max(500);
export type OrderSyncInput = z.infer<typeof ordersSyncSchema>;
export const parseOrdersSync = (input: unknown): OrderSyncInput => ordersSyncSchema.parse(input);
