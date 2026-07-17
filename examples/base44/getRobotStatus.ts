import { floubaRequest } from './flouba-client';
export const getRobotStatus = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/status`);
