import type { RequestHandler } from 'express';
import { prisma } from '../config/database.js';

export const auditMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    void prisma.apiRequestLog.create({
      data: {
        requestId: req.requestId ?? 'unknown', method: req.method, path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode, durationMs: Date.now() - startedAt, robotId: req.robotId,
        accountLogin: req.accountLogin, actorType: req.actorType, ipAddress: req.ip, userAgent: req.get('user-agent'),
      },
    }).catch(() => undefined);
  });
  next();
};
