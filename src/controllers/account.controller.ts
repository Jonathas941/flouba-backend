import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { syncAccount } from '../services/account.service.js';
import { parseAccountSync } from '../validators/account.validators.js';
export const sync = asyncHandler(async (req, res) =>
  successResponse(res, await syncAccount({ robotId: req.robotId!, accountLogin: req.accountLogin!, ...parseAccountSync(req.body) })),
);
