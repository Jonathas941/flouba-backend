import { floubaRequest } from './flouba-client';
export const updateRobotSettings = (robotId: string, settings: Record<string, unknown>) =>
  floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/settings`, { method: 'POST', body: settings });
