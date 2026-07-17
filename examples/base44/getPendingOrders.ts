import { floubaRequest } from './flouba-client';
export const getPendingOrders = (robotId: string, includeStale = false) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/orders`, { query: { includeStale } });
