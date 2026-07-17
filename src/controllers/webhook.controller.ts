import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { getWebhookEvent, listWebhookEvents } from '../services/webhook.service.js';

export const list = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const events = await listWebhookEvents(status);
  return successResponse(res, events);
});
export const getStatus = asyncHandler(async (req, res) => successResponse(res, await getWebhookEvent(req.params.webhookId)));
