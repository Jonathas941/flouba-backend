import { APP_NAME } from '../config/constants.js';
import { prisma } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { asyncHandler } from '../utils/async-handler.js';
import { errorResponse, successResponse } from '../utils/api-response.js';
import { ErrorCodes } from '../utils/errors.js';

const startedAt = Date.now();

async function databaseStatus(): Promise<'up' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch {
    return 'down';
  }
}

export const health = asyncHandler(async (_req, res) => {
  const env = getEnv();
  const db = await databaseStatus();
  return successResponse(res, {
    service: APP_NAME,
    version: env.APP_VERSION,
    status: db === 'up' ? 'ok' : 'degraded',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    serverTimestamp: new Date().toISOString(),
    database: db,
    environment: env.NODE_ENV,
  });
});

export const live = asyncHandler(async (_req, res) => {
  const env = getEnv();
  return successResponse(res, {
    service: APP_NAME,
    version: env.APP_VERSION,
    status: 'alive',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    serverTimestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

export const ready = asyncHandler(async (_req, res) => {
  const env = getEnv();
  const db = await databaseStatus();
  if (db !== 'up') {
    return errorResponse(res, 503, ErrorCodes.DATABASE_ERROR, 'Database is not ready');
  }
  return successResponse(res, {
    service: APP_NAME,
    version: env.APP_VERSION,
    status: 'ready',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    serverTimestamp: new Date().toISOString(),
    database: db,
    environment: env.NODE_ENV,
  });
});
