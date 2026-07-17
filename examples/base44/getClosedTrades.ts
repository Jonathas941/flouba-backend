import { floubaRequest } from './flouba-client';
export const getClosedTrades = (robotId: string, offset = 0, limit = 100) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/trades`, { query: { offset, limit } });
