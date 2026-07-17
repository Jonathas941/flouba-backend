import { floubaRequest } from './flouba-client';
export const resumeRobot = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/resume`, { method: 'POST', body: {} });
