import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';
import { errorResponse } from '../utils/api-response.js';

function limiter(max: number) {
  return rateLimit({
    windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => errorResponse(res, 429, 'RATE_LIMITED', 'Too many requests'),
  });
}

export const healthLimiter = limiter(120);
export const base44Limiter = limiter(300);
export const mt5HeartbeatLimiter = limiter(600);
export const mt5PollLimiter = limiter(600);
export const commandCreateLimiter = limiter(120);
export const emergencyLimiter = limiter(30);
export const authFailureLimiter = limiter(20);
