import type { Response } from 'express';

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export function successResponse<T>(
  res: Response,
  data: T,
  statusCode = 200,
  extraMeta: Record<string, unknown> = {},
): Response {
  const requestId = res.locals.requestId ?? 'unknown';
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...extraMeta,
    },
  });
}

export function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): Response {
  const requestId = res.locals.requestId ?? 'unknown';
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
