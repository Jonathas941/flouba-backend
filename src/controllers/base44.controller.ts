import { CommandType } from '@prisma/client';
import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { prisma } from '../config/database.js';
import { getAccount } from '../services/account.service.js';
import { cancelAll, closeAll, createCommand, listCommands, pauseRobot, resumeRobot, startRobot, stopRobot } from '../services/command.service.js';
import { getLatestIndicators } from '../services/indicators.service.js';
import { listOrders } from '../services/order.service.js';
import { listPositions } from '../services/position.service.js';
import { getRobot, getRobotStatus, listRobots } from '../services/robot.service.js';
import { getSettings } from '../services/settings.service.js';
import { listTrades } from '../services/trade.service.js';
import { parseControlCommand } from '../validators/command.validators.js';

const page = (query: Record<string, unknown>) => ({ skip: Math.max(Number(query.offset) || 0, 0), take: Math.min(Math.max(Number(query.limit) || 100, 1), 500) });
export const robots = asyncHandler(async (req, res) => successResponse(res, await listRobots(page(req.query))));
export const account = asyncHandler(async (req, res) => successResponse(res, await getAccount(req.params.robotId)));
export const heartbeat = asyncHandler(async (req, res) => successResponse(res, await prisma.robotHeartbeat.findMany({ where: { robotId: req.params.robotId }, orderBy: { receivedAt: 'desc' }, ...page(req.query) })));
export const positions = asyncHandler(async (req, res) => successResponse(res, await listPositions(req.params.robotId, req.query.includeStale === 'true')));
export const orders = asyncHandler(async (req, res) => successResponse(res, await listOrders(req.params.robotId, req.query.includeStale === 'true')));
export const trades = asyncHandler(async (req, res) => successResponse(res, await listTrades(req.params.robotId, page(req.query))));
export const commands = asyncHandler(async (req, res) => successResponse(res, await listCommands(req.params.robotId, page(req.query))));
export const logs = asyncHandler(async (req, res) => successResponse(res, await prisma.robotLog.findMany({ where: { robotId: req.params.robotId }, orderBy: { createdAt: 'desc' }, ...page(req.query) })));
export const settings = asyncHandler(async (req, res) => successResponse(res, await getSettings(req.params.robotId)));
export const indicators = asyncHandler(async (req, res) => successResponse(res, await getLatestIndicators(req.params.robotId)));
export const robot = asyncHandler(async (req, res) => successResponse(res, await getRobot(req.params.robotId)));
export const status = asyncHandler(async (req, res) => successResponse(res, await getRobotStatus(req.params.robotId)));

export const control = (commandType: CommandType) =>
  asyncHandler(async (req, res) => {
    const robotId = req.params.robotId;
    const body = parseControlCommand(req.body);
    const idempotencyKey =
      (typeof req.header('x-idempotency-key') === 'string' ? req.header('x-idempotency-key') : undefined) ??
      body.idempotencyKey;
    const metadata = body.metadata;
    const options = { createdBy: req.actorType, idempotencyKey, metadata };
    const commandsByType: Partial<
      Record<CommandType, (id: string, opts?: typeof options) => ReturnType<typeof createCommand>>
    > = {
      [CommandType.START_ROBOT]: startRobot,
      [CommandType.STOP_ROBOT]: stopRobot,
      [CommandType.PAUSE_ROBOT]: pauseRobot,
      [CommandType.RESUME_ROBOT]: resumeRobot,
      [CommandType.CLOSE_ALL_POSITIONS]: closeAll,
      [CommandType.CANCEL_ALL_PENDING_ORDERS]: cancelAll,
    };
    const command = await (commandsByType[commandType]?.(robotId, options) ??
      createCommand({
        robotId,
        commandType,
        createdBy: req.actorType,
        idempotencyKey,
        metadata,
      }));
    return successResponse(res, command, 201);
  });
