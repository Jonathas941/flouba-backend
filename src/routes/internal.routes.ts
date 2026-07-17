import { Router } from 'express';
import { prisma } from '../config/database.js';
import { list, getStatus } from '../controllers/webhook.controller.js';
import { runDailyStatisticsJob } from '../jobs/daily-statistics.job.js';
import { runExpiredCommandJob } from '../jobs/expired-command.job.js';
import { runLogCleanupJob } from '../jobs/log-cleanup.job.js';
import { runRobotOfflineJob } from '../jobs/robot-offline.job.js';
import { runStaleCommandJob } from '../jobs/stale-command.job.js';
import { internalAuthMiddleware } from '../middleware/internal-auth.middleware.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { parseEmptyBody } from '../validators/common.validators.js';

const JOBS: Record<string, () => Promise<unknown>> = {
  'robot-offline': runRobotOfflineJob,
  'stale-command': runStaleCommandJob,
  'expired-command': runExpiredCommandJob,
  'daily-statistics': runDailyStatisticsJob,
  'log-cleanup': runLogCleanupJob,
};

export const internalRouter = Router();
internalRouter.use(internalAuthMiddleware);

internalRouter.get(
  '/diagnostics',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    return successResponse(res, { database: 'connected', now: new Date().toISOString() });
  }),
);

internalRouter.post(
  '/jobs/:jobName/trigger',
  asyncHandler(async (req, res) => {
    parseEmptyBody(req.body);
    const job = JOBS[req.params.jobName];
    if (!job) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Unknown job: ${req.params.jobName}`, 404);
    }
    const result = await job();
    return successResponse(res, {
      jobName: req.params.jobName,
      triggered: true,
      result: result ?? null,
    });
  }),
);

internalRouter.get(
  '/security-events',
  asyncHandler(async (_req, res) =>
    successResponse(
      res,
      await prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    ),
  ),
);

internalRouter.get('/webhooks', list);
internalRouter.get('/webhooks/:webhookId', getStatus);
