import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { acknowledge as acknowledgeCommand, markExecuting, reportResult } from '../services/command.service.js';
import { processHeartbeat } from '../services/heartbeat.service.js';
import { deliverCommands } from '../queue/command-queue.js';
import { parseCommandAcknowledge, parseCommandExecuting, parseCommandResult } from '../validators/command.validators.js';
import { parseHeartbeat } from '../validators/heartbeat.validators.js';

export const heartbeat = asyncHandler(async (req, res) =>
  successResponse(res, await processHeartbeat({ ...parseHeartbeat(req.body), robotId: req.robotId!, accountLogin: req.accountLogin! })),
);
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
