import { Router } from 'express';
import * as mt5 from '../controllers/mt5.controller.js';
import { sync as syncAccount } from '../controllers/account.controller.js';
import { sync as syncPositions } from '../controllers/position.controller.js';
import { sync as syncOrders } from '../controllers/order.controller.js';
import { sync as syncTrades } from '../controllers/trade.controller.js';
import { register } from '../controllers/robot.controller.js';
import { mt5AuthMiddleware, mt5RegistrationAuthMiddleware } from '../middleware/mt5-auth.middleware.js';
import { mt5HeartbeatLimiter, mt5PollLimiter } from '../middleware/rate-limit.middleware.js';

export const bridgeRouter = Router();

// Legacy /api/bridge/* paths that alias to /api/mt5/* handlers
bridgeRouter.post('/register', mt5RegistrationAuthMiddleware, register);
bridgeRouter.use(mt5AuthMiddleware);
bridgeRouter.post('/heartbeat', mt5HeartbeatLimiter, mt5.heartbeat);
bridgeRouter.post('/account', syncAccount);
bridgeRouter.post('/positions', syncPositions);
bridgeRouter.post('/orders', syncOrders);
bridgeRouter.post('/indicators', mt5.indicators);
bridgeRouter.post('/trade-history', syncTrades);
bridgeRouter.get('/commands', mt5PollLimiter, mt5.pollCommands);
bridgeRouter.post('/result', mt5.result);
