import { CommandPriority, CommandType, TradeDirection } from '@prisma/client';
import { z } from 'zod';

const finite = z.coerce.number().finite();

export const createCommandSchema = z.object({
  commandType: z.nativeEnum(CommandType),
  symbol: z.string().max(64).optional(),
  direction: z.nativeEnum(TradeDirection).optional(),
  lotSize: finite.positive().optional(),
  riskPercent: finite.min(0).max(100).optional(),
  entryPrice: finite.positive().optional(),
  stopLoss: finite.positive().optional(),
  takeProfit: finite.positive().optional(),
  trailingStopPoints: finite.positive().optional(),
  breakEvenTriggerPoints: finite.positive().optional(),
  partialClosePercent: finite.min(0).max(100).optional(),
  brokerTicket: z.string().max(128).optional(),
  brokerPositionId: z.string().max(128).optional(),
  brokerOrderId: z.string().max(128).optional(),
  magicNumber: z.coerce.number().int().optional(),
  comment: z.string().max(1024).optional(),
  metadata: z.record(z.unknown()).optional(),
  priority: z.nativeEnum(CommandPriority).default(CommandPriority.NORMAL),
  expiresInSeconds: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export const controlCommandSchema = z
  .object({
    idempotencyKey: z.string().min(1).max(256).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const commandAcknowledgeSchema = z.object({
  robotId: z.string().min(1).optional(),
  acknowledged: z.boolean().optional(),
  receivedAt: z.string().datetime().optional(),
  message: z.string().max(2048).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const commandExecutingSchema = z.object({
  robotId: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const commandResultSchema = z.object({
  commandId: z.string().optional(),
  robotId: z.string().optional(),
  success: z.boolean(),
  brokerOrderId: z.string().optional(),
  brokerPositionId: z.string().optional(),
  brokerTicket: z.string().optional(),
  symbol: z.string().optional(),
  direction: z.nativeEnum(TradeDirection).optional(),
  requestedLot: finite.optional(),
  executedLot: finite.optional(),
  requestedPrice: finite.optional(),
  executedPrice: finite.optional(),
  stopLoss: finite.optional(),
  takeProfit: finite.optional(),
  spread: finite.optional(),
  slippage: finite.optional(),
  commission: finite.optional(),
  swap: finite.optional(),
  brokerReturnCode: z.coerce.number().int().optional(),
  brokerMessage: z.string().max(2048).optional(),
  executionDurationMs: z.coerce.number().int().min(0).optional(),
  errorCode: z.string().max(128).optional(),
  errorMessage: z.string().max(2048).optional(),
  terminalTimestamp: z.coerce.date().optional(),
  timestamp: z.coerce.date().optional(),
  clientTimestamp: z.coerce.date().optional(),
});

export type CreateCommandInput = z.infer<typeof createCommandSchema>;
export type CommandResultInput = z.infer<typeof commandResultSchema>;

export const parseCreateCommand = (input: unknown): CreateCommandInput => createCommandSchema.parse(input);
export const parseControlCommand = (input: unknown) => controlCommandSchema.parse(input);
export const parseCommandAcknowledge = (input: unknown) => commandAcknowledgeSchema.parse(input);
export const parseCommandExecuting = (input: unknown) => commandExecutingSchema.parse(input);
export const parseCommandResult = (input: unknown): CommandResultInput => commandResultSchema.parse(input);
