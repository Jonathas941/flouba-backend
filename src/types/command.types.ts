import type {
  CommandPriority,
  CommandStatus,
  CommandType,
  TradeDirection,
} from '@prisma/client';

export interface CreateCommandInput {
  robotId: string;
  accountLogin?: string;
  commandType: CommandType;
  symbol?: string;
  direction?: TradeDirection;
  lotSize?: number;
  riskPercent?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopPoints?: number;
  breakEvenTriggerPoints?: number;
  partialClosePercent?: number;
  brokerTicket?: string;
  brokerPositionId?: string;
  brokerOrderId?: string;
  magicNumber?: number;
  comment?: string;
  metadata?: Record<string, unknown>;
  priority?: CommandPriority;
  expiresInSeconds?: number;
  idempotencyKey?: string;
  createdBy?: string;
}

export interface CommandDeliveryItem {
  commandId: string;
  commandType: CommandType;
  symbol: string | null;
  direction: TradeDirection | null;
  lotSize: number | null;
  riskPercent: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  trailingStopPoints: number | null;
  breakEvenTriggerPoints: number | null;
  partialClosePercent: number | null;
  brokerTicket: string | null;
  brokerPositionId: string | null;
  brokerOrderId: string | null;
  magicNumber: number | null;
  comment: string | null;
  metadata: unknown;
  priority: CommandPriority;
  expiresAt: string | null;
  createdAt: string;
}

export interface CommandResultInput {
  commandId: string;
  robotId: string;
  success: boolean;
  brokerOrderId?: string;
  brokerPositionId?: string;
  brokerTicket?: string;
  symbol?: string;
  direction?: TradeDirection;
  requestedLot?: number;
  executedLot?: number;
  requestedPrice?: number;
  executedPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  spread?: number;
  slippage?: number;
  commission?: number;
  swap?: number;
  brokerReturnCode?: number;
  brokerMessage?: string;
  executionDurationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  terminalTimestamp?: string | Date;
  timestamp?: string | Date;
  clientTimestamp?: string | Date;
}

export type { CommandStatus, CommandType, CommandPriority };
