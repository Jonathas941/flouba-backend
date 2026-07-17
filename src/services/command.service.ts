import { Prisma } from '@prisma/client';
import { getEnv } from '../config/env.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { decimalOrZero } from '../utils/numeric.js';
import * as commands from '../repositories/command.repository.js';
import { getRobot } from './robot.service.js';
import { validateCommand } from './risk.service.js';
import type { CommandResultInput, CreateCommandInput } from '../types/command.types.js';

export async function createCommand(input: CreateCommandInput) {
  const robot = await getRobot(input.robotId);
  if (input.idempotencyKey) {
    const existing = await commands.findByIdempotency(input.robotId, input.idempotencyKey);
    if (existing) return existing;
  }
  const decision = await validateCommand(input);
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? robot.settings?.commandExpirationSeconds ?? getEnv().COMMAND_EXPIRATION_SECONDS) * 1000);
  const data: Prisma.TradeCommandUncheckedCreateInput = { robotId: input.robotId, accountLogin: input.accountLogin ?? robot.accountLogin, commandType: input.commandType, symbol: input.symbol, direction: input.direction, lotSize: input.lotSize == null ? null : decimalOrZero(input.lotSize), riskPercent: input.riskPercent == null ? null : decimalOrZero(input.riskPercent), entryPrice: input.entryPrice == null ? null : decimalOrZero(input.entryPrice), stopLoss: input.stopLoss == null ? null : decimalOrZero(input.stopLoss), takeProfit: input.takeProfit == null ? null : decimalOrZero(input.takeProfit), trailingStopPoints: input.trailingStopPoints == null ? null : decimalOrZero(input.trailingStopPoints), breakEvenTriggerPoints: input.breakEvenTriggerPoints == null ? null : decimalOrZero(input.breakEvenTriggerPoints), partialClosePercent: input.partialClosePercent == null ? null : decimalOrZero(input.partialClosePercent), brokerTicket: input.brokerTicket, brokerPositionId: input.brokerPositionId, brokerOrderId: input.brokerOrderId, magicNumber: input.magicNumber, comment: input.comment, metadata: input.metadata as Prisma.InputJsonValue | undefined, priority: input.priority ?? 'NORMAL', idempotencyKey: input.idempotencyKey, createdBy: input.createdBy, expiresAt, maximumRetryCount: getEnv().MAX_COMMAND_RETRY_COUNT, status: decision.allowed ? 'QUEUED' : 'REJECTED', rejectionCode: decision.allowed ? null : decision.code, rejectionReason: decision.allowed ? null : decision.message };
  try {
    const command = await commands.create(data);
    if (!decision.allowed) await commands.appendStatusHistory(command.commandId, 'REJECTED', null, decision.message, decision.details as Prisma.InputJsonValue | undefined);
    return command;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && input.idempotencyKey) return (await commands.findByIdempotency(input.robotId, input.idempotencyKey))!;
    throw error;
  }
}
export async function acknowledge(robotId: string, commandId: string, metadata?: Record<string, unknown>) {
  const c = await requireOwned(robotId, commandId);
  if (c.status !== 'DELIVERED') {
    throw new AppError(ErrorCodes.CONFLICT, 'Command is not deliverable for acknowledgement', 409);
  }
  const data: Prisma.TradeCommandUpdateInput = { acknowledgedAt: new Date() };
  if (metadata) {
    data.metadata = metadata as Prisma.InputJsonValue;
  }
  return commands.updateStatus(commandId, 'ACKNOWLEDGED', data);
}

export async function markExecuting(robotId: string, commandId: string, metadata?: Record<string, unknown>) {
  const c = await requireOwned(robotId, commandId);
  if (!['DELIVERED', 'ACKNOWLEDGED'].includes(c.status)) {
    throw new AppError(ErrorCodes.CONFLICT, 'Command cannot enter execution', 409);
  }
  const data: Prisma.TradeCommandUpdateInput = { executionStartedAt: new Date() };
  if (metadata) {
    data.metadata = metadata as Prisma.InputJsonValue;
  }
  return commands.updateStatus(commandId, 'EXECUTING', data);
}
export async function reportResult(input: CommandResultInput) {
  const c = await requireOwned(input.robotId, input.commandId);
  if (['COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(c.status)) {
    throw new AppError(ErrorCodes.COMMAND_ALREADY_PROCESSED, 'Command is already terminal', 409);
  }
  const terminalStatus = input.success ? 'COMPLETED' : 'FAILED';
  const patch: Prisma.TradeCommandUpdateInput = input.success
    ? {
        completedAt: new Date(),
        brokerOrderId: input.brokerOrderId,
        brokerPositionId: input.brokerPositionId,
        brokerTicket: input.brokerTicket,
        execution: { upsert: { create: executionData(input, c), update: executionData(input, c) } },
      }
    : {
        failedAt: new Date(),
        execution: { upsert: { create: executionData(input, c), update: executionData(input, c) } },
      };
  return commands.updateStatus(input.commandId, terminalStatus, patch);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function executionData(
  input: CommandResultInput,
  c: { robotId: string; lotSize: Prisma.Decimal | null; entryPrice: Prisma.Decimal | null },
) {
  return {
    robotId: c.robotId,
    success: input.success,
    brokerOrderId: input.brokerOrderId,
    brokerPositionId: input.brokerPositionId,
    brokerTicket: input.brokerTicket,
    symbol: input.symbol,
    direction: input.direction,
    requestedLot: input.requestedLot == null ? c.lotSize : decimalOrZero(input.requestedLot),
    executedLot: input.executedLot == null ? null : decimalOrZero(input.executedLot),
    requestedPrice: input.requestedPrice == null ? c.entryPrice : decimalOrZero(input.requestedPrice),
    executedPrice: input.executedPrice == null ? null : decimalOrZero(input.executedPrice),
    stopLoss: input.stopLoss == null ? null : decimalOrZero(input.stopLoss),
    takeProfit: input.takeProfit == null ? null : decimalOrZero(input.takeProfit),
    spread: input.spread == null ? null : decimalOrZero(input.spread),
    slippage: input.slippage == null ? null : decimalOrZero(input.slippage),
    commission: input.commission == null ? null : decimalOrZero(input.commission),
    swap: input.swap == null ? null : decimalOrZero(input.swap),
    brokerReturnCode: input.brokerReturnCode,
    brokerMessage: input.brokerMessage,
    executionDurationMs: input.executionDurationMs,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    terminalTimestamp: toDate(input.terminalTimestamp),
    clientTimestamp: toDate(input.timestamp),
  };
}

async function requireOwned(robotId: string, commandId: string) { const c = await commands.findByCommandId(commandId); if (!c) throw new AppError(ErrorCodes.COMMAND_NOT_FOUND, 'Command not found', 404); if (c.robotId !== robotId) throw new AppError(ErrorCodes.FORBIDDEN, 'Command belongs to another robot', 403); return c; }
export const listCommands = commands.listForRobot;

type ControlOptions = {
  createdBy?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

const control =
  (commandType: CreateCommandInput['commandType']) =>
  (robotId: string, createdByOrOptions?: string | ControlOptions) => {
    const options: ControlOptions =
      typeof createdByOrOptions === 'string' || createdByOrOptions === undefined
        ? { createdBy: createdByOrOptions }
        : createdByOrOptions;
    return createCommand({
      robotId,
      commandType,
      priority: commandType === 'EMERGENCY_STOP' ? 'CRITICAL' : 'HIGH',
      createdBy: options.createdBy,
      idempotencyKey: options.idempotencyKey,
      metadata: options.metadata,
    });
  };

export const startRobot = control('START_ROBOT');
export const stopRobot = control('STOP_ROBOT');
export const pauseRobot = control('PAUSE_ROBOT');
export const resumeRobot = control('RESUME_ROBOT');
export const closeAll = control('CLOSE_ALL_POSITIONS');
export const cancelAll = control('CANCEL_ALL_PENDING_ORDERS');
