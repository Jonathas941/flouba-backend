import { retryAbandonedDeliveries } from '../queue/command-retry.js';
export const runStaleCommandJob = () => retryAbandonedDeliveries();
