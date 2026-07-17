import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { syncPositions } from '../services/position.service.js';
import { parsePositionsSync } from '../validators/position.validators.js';
export const sync = asyncHandler(async (req, res) =>
  successResponse(res, await syncPositions(req.robotId!, parsePositionsSync(req.body).map((position) => ({
    ...position,
    robotId: req.robotId!,
    accountLogin: req.accountLogin!,
  }))),
));
