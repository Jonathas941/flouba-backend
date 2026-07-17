import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '../config/env.js';
import { getLogger } from '../config/logger.js';
import { errorResponse } from '../utils/api-response.js';
import { ErrorCodes, isAppError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof ZodError) {
    const logger = getLogger();
    const validationDetails = error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: issue.received,
    }));
    logger.error({
      type: 'VALIDATION_ERROR',
      method: req.method,
      path: req.path,
      robotId: req.robotId || 'unknown',
      accountLogin: req.accountLogin || 'unknown',
      validationIssues: validationDetails,
      requestId: req.requestId,
    }, 'Request validation failed');
    errorResponse(res, 400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed', { issues: error.issues });
    return;
  }
  if (isAppError(error)) {
    errorResponse(res, error.statusCode, error.code, error.message, error.details);
    return;
  }
  const err = error instanceof Error ? error : new Error('Unknown error');
  getLogger().error({ err, requestId: req.requestId }, 'Unhandled request error');
  const details = getEnv().NODE_ENV === 'production' ? {} : { stack: err.stack };
  errorResponse(res, 500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred', details);
};
