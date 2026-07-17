import { floubaRequest } from './flouba-client';
export const pauseRobot = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/pause`, { method: 'POST', body: {} });
