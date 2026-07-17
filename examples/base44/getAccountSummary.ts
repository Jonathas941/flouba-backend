import { floubaRequest } from './flouba-client';
export const getAccountSummary = (robotId: string) => floubaRequest(`/api/base44/robots/${encodeURIComponent(robotId)}/account`);
