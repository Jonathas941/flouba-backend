import { floubaRequest } from './flouba-client';
export const createTradeCommand = (robotId: string, command: Record<string, unknown>) =>
  floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/commands`, { method: 'POST', body: command });
