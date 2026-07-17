import type { RequestHandler } from 'express';
import { getEnv } from '../config/env.js';
import { prisma } from '../config/database.js';
import { verifyApiKey, verifyHmacSignature } from '../security/api-key.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

function recordFailure(req: Parameters<RequestHandler>[0], message: string): void {
  void prisma.securityEvent.create({
    data: { eventType: 'BASE44_AUTH_FAILURE', message, actorType: 'base44', ipAddress: req.ip, userAgent: req.get('user-agent'), requestId: req.requestId },
  }).catch(() => undefined);
}

export const base44AuthMiddleware: RequestHandler = (req, _res, next) => {
  const env = getEnv();
  const timestamp = req.header('x-timestamp');
  const requestId = req.header('x-request-id');
  const fail = (error: AppError): void => { recordFailure(req, error.message); next(error); };
  if (!requestId || !timestamp) return fail(new AppError(ErrorCodes.UNAUTHORIZED, 'x-request-id and x-timestamp are required', 401));
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > env.REQUEST_TIMESTAMP_TOLERANCE_SECONDS * 1000) {
    return fail(new AppError(ErrorCodes.REQUEST_EXPIRED, 'Request timestamp is outside the permitted window', 401));
  }
  if (!verifyApiKey(req.header('x-api-key'), env.BASE44_API_KEY)) return fail(new AppError(ErrorCodes.INVALID_API_KEY, 'Invalid API key', 401));
  if (env.ENABLE_HMAC_VALIDATION && env.BASE44_HMAC_SECRET) {
    const signature = req.header('x-signature');
    const body = JSON.stringify(req.body ?? {});
    if (!signature || !verifyHmacSignature({ method: req.method, path: req.originalUrl.split('?')[0], timestamp, body, secret: env.BASE44_HMAC_SECRET, signature })) {
      return fail(new AppError(ErrorCodes.INVALID_SIGNATURE, 'Invalid request signature', 401));
    }
  }
  req.actorType = 'base44';
  next();
};
