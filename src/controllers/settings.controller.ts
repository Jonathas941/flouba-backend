import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { updateSettings } from '../services/settings.service.js';
import { parseSettingsUpdate } from '../validators/settings.validators.js';
export const update = asyncHandler(async (req, res) => successResponse(res, await updateSettings(req.params.robotId, parseSettingsUpdate(req.body), req.actorType)));
