import type { RequestHandler } from 'express';
import { getEnv } from '../config/env.js';
import { verifyApiKey, hashSha256 } from '../security/api-key.js';
import { getRobot } from '../services/robot.service.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

function authenticateMt5(requireRegisteredRobot: boolean): RequestHandler {
  return async (req, _res, next) => {
  try {
    const env = getEnv();
    const robotId = req.header('x-robot-id');
    const accountLogin = req.header('x-account-login');
    const requestId = req.header('x-request-id');
    const timestamp = req.header('x-timestamp');
    if (!robotId || !accountLogin || !requestId || !timestamp) throw new AppError(ErrorCodes.UNAUTHORIZED, 'MT5 identity and request headers are required', 401);
    const timestampMs = Date.parse(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > env.REQUEST_TIMESTAMP_TOLERANCE_SECONDS * 1000) throw new AppError(ErrorCodes.REQUEST_EXPIRED, 'Request timestamp is outside the permitted window', 401);
    if (!verifyApiKey(req.header('x-robot-api-key'), env.MT5_ROBOT_API_KEY)) throw new AppError(ErrorCodes.INVALID_API_KEY, 'Invalid robot API key', 401);
    if (requireRegisteredRobot) {
      const robot = await getRobot(robotId);
      if (robot.accountLogin !== accountLogin) throw new AppError(ErrorCodes.FORBIDDEN, 'Account does not belong to robot', 403);
      const robotToken = req.header('x-robot-token');
      if (robot.robotTokenHash && (!robotToken || hashSha256(robotToken) !== robot.robotTokenHash)) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid robot token', 401);
      req.robot = robot;
    }
    req.robotId = robotId;
    req.accountLogin = accountLogin;
    req.actorType = 'mt5';
    next();
  } catch (error) { next(error); }
  };
}

export const mt5AuthMiddleware = authenticateMt5(true);
export const mt5RegistrationAuthMiddleware = authenticateMt5(false);
