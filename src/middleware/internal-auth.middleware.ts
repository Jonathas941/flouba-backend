import type { RequestHandler } from 'express';
import { getEnv } from '../config/env.js';
import { verifyApiKey } from '../security/api-key.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

export const internalAuthMiddleware: RequestHandler = (req, _res, next) => {
  if (!verifyApiKey(req.header('x-internal-api-key'), getEnv().INTERNAL_ADMIN_API_KEY)) {
    return next(new AppError(ErrorCodes.INVALID_API_KEY, 'Invalid internal API key', 401));
  }
  req.actorType = 'internal';
  next();
};
