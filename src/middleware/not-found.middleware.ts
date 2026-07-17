import type { RequestHandler } from 'express';
import { errorResponse } from '../utils/api-response.js';
import { ErrorCodes } from '../utils/errors.js';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  errorResponse(res, 404, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.originalUrl} was not found`);
};
