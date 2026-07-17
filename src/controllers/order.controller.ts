import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { syncOrders } from '../services/order.service.js';
import { parseOrdersSync } from '../validators/order.validators.js';
export const sync = asyncHandler(async (req, res) =>
  successResponse(res, await syncOrders(req.robotId!, parseOrdersSync(req.body).map((order) => ({
    ...order,
    robotId: req.robotId!,
    accountLogin: req.accountLogin!,
  }))),
));
