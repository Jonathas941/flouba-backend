import { floubaRequest } from './flouba-client';
export const emergencyStop = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/emergency-stop`, { method: 'POST', body: {} });
