import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { getRobot, registerRobot } from '../services/robot.service.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { parseRobotRegistration } from '../validators/robot.validators.js';

export const register = asyncHandler(async (req, res) => {
  const parsed = parseRobotRegistration(req.body);
  const { robotId, timestamp: _timestamp, ...data } = parsed;
  if (req.robotId && req.robotId !== robotId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Registered robotId must match x-robot-id', 403);
  }
  if (req.accountLogin && req.accountLogin !== data.accountLogin) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Registered accountLogin must match x-account-login', 403);
  }
  const robot = await registerRobot(robotId, data);
  return successResponse(res, robot, 201);
});
export const getById = asyncHandler(async (req, res) => successResponse(res, await getRobot(req.params.robotId)));

export const createRobot = asyncHandler(async (req, res) => {
  const parsed = parseRobotRegistration(req.body);
  const { robotId, timestamp: _timestamp, ...data } = parsed;
  const robot = await registerRobot(robotId, data);
  return successResponse(res, robot, 201);
});
