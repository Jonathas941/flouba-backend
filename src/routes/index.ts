import { Router } from 'express';
import { base44Router } from './base44.routes.js';
import { healthRouter } from './health.routes.js';
import { internalRouter } from './internal.routes.js';
import { mt5Router } from './mt5.routes.js';

export const router = Router();
router.use(healthRouter);
router.use('/api/base44', base44Router);
router.use('/api/mt5', mt5Router);
router.use('/api/internal', internalRouter);
