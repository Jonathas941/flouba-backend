import { floubaRequest } from './flouba-client';
export const startRobot = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/start`, { method: 'POST', body: {} });
