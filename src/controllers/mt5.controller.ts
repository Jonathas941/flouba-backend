import { asyncHandler } from '../utils/async-handler.js';
import { errorResponse, successResponse } from '../utils/api-response.js';
import { ErrorCodes } from '../utils/errors.js';
import { getLogger } from '../config/logger.js';
import { acknowledge as acknowledgeCommand, markExecuting, reportResult } from '../services/command.service.js';
import { processHeartbeat } from '../services/heartbeat.service.js';
import { deliverCommands } from '../queue/command-queue.js';
import { parseCommandAcknowledge, parseCommandExecuting, parseCommandResult } from '../validators/command.validators.js';
import { heartbeatSchema } from '../validators/heartbeat.validators.js';
import { normalizeHeartbeatPayload } from '../utils/heartbeat-normalizer.js';

export const heartbeat = asyncHandler(async (req, res) => {
  const robotId = req.robotId!;
  const accountLogin = req.accountLogin!;
  const requestId = req.requestId;

  const normalized = normalizeHeartbeatPayload(req.body);
  const parsed = heartbeatSchema.safeParse(normalized);

  if (!parsed.success) {
    const issuePaths = parsed.error.issues.map((issue) => issue.path.join('.'));
    getLogger().error({ robotId, requestId, issuePaths }, 'Heartbeat validation failed');
    return errorResponse(res, 400, ErrorCodes.VALIDATION_ERROR, 'Heartbeat payload validation failed', {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  getLogger().info(
    { robotId, requestId, robotStatus: parsed.data.robotStatus, autoTradingEnabled: parsed.data.autoTradingEnabled },
    'Heartbeat received',
  );

  try {
    const result = await processHeartbeat({ ...parsed.data, robotId, accountLogin });
    return successResponse(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    getLogger().error({ robotId, requestId, error: message }, 'Heartbeat processing failed');
    return errorResponse(res, 500, ErrorCodes.INTERNAL_ERROR, 'Failed to process heartbeat');
  }
});
export const pollCommands = asyncHandler(async (req, res) =>
  successResponse(res, await deliverCommands(req.robotId!, req.requestId!, Math.min(Math.max(Number(req.query.limit) || 20, 1), 100))),
);
export const acknowledge = asyncHandler(async (req, res) => {
  const { metadata } = parseCommandAcknowledge(req.body);
  return successResponse(res, await acknowledgeCommand(req.robotId!, req.params.commandId, metadata));
});
export const executing = asyncHandler(async (req, res) => {
  const { metadata } = parseCommandExecuting(req.body);
  return successResponse(res, await markExecuting(req.robotId!, req.params.commandId, metadata));
});
export const result = asyncHandler(async (req, res) =>
  successResponse(res, await reportResult({ ...parseCommandResult(req.body), commandId: req.params.commandId, robotId: req.robotId! })),
);
