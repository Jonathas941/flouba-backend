import { Router } from 'express';
import { health, live, ready } from '../controllers/health.controller.js';
import { healthLimiter } from '../middleware/rate-limit.middleware.js';

export const healthRouter = Router();
healthRouter.get('/health', healthLimiter, health);
healthRouter.get('/health/live', healthLimiter, live);
healthRouter.get('/health/ready', healthLimiter, ready);
