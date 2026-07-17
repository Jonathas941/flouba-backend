import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { createCommand } from '../services/command.service.js';
import { getRobot } from '../services/robot.service.js';
import { parseCreateCommand } from '../validators/command.validators.js';

export const create = asyncHandler(async (req, res) => {
  const input = parseCreateCommand(req.body);
  const robotId = req.params.robotId;
  const robot = await getRobot(robotId);
  const idempotencyKey = req.header('x-idempotency-key') ?? input.idempotencyKey;
  const command = await createCommand({
    ...input,
    robotId,
    accountLogin: robot.accountLogin,
    createdBy: req.actorType,
    idempotencyKey,
  });
  return successResponse(res, command, 201);
});
