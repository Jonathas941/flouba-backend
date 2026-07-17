import { floubaRequest } from './flouba-client';
export const getOpenPositions = (robotId: string, includeStale = false) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/positions`, { query: { includeStale } });
