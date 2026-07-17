import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { syncTrades } from '../services/trade.service.js';
import { parseTradesSync } from '../validators/trade.validators.js';
export const sync = asyncHandler(async (req, res) =>
  successResponse(res, await syncTrades(req.robotId!, parseTradesSync(req.body).map((trade) => ({
    ...trade,
    robotId: req.robotId!,
    accountLogin: req.accountLogin!,
  }))),
));
