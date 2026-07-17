import { floubaRequest } from './flouba-client';
export const closeAllPositions = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/close-all`, { method: 'POST', body: {} });
