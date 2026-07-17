import { floubaRequest } from './flouba-client';
export const stopRobot = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/stop`, { method: 'POST', body: {} });
