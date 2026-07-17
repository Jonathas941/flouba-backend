import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { activateEmergencyStop, clearEmergencyStop } from '../services/emergency.service.js';
import { parseEmptyBody } from '../validators/common.validators.js';

export const activate = asyncHandler(async (req, res) => {
  parseEmptyBody(req.body);
  return successResponse(res, await activateEmergencyStop(req.params.robotId, req.actorType));
});
export const clear = asyncHandler(async (req, res) => {
  parseEmptyBody(req.body);
  return successResponse(res, await clearEmergencyStop(req.params.robotId));
});
