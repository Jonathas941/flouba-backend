import { getEnv } from '../config/env.js';
import { prisma } from '../config/database.js';
export async function runLogCleanupJob() {
  const env = getEnv(); const now = Date.now();
  const [logs, requests, heartbeats] = await prisma.$transaction([
    prisma.robotLog.deleteMany({ where: { createdAt: { lt: new Date(now - env.LOG_RETENTION_DAYS * 86400000) } } }),
    prisma.apiRequestLog.deleteMany({ where: { createdAt: { lt: new Date(now - env.API_REQUEST_LOG_RETENTION_DAYS * 86400000) } } }),
    prisma.robotHeartbeat.deleteMany({ where: { receivedAt: { lt: new Date(now - env.HEARTBEAT_HISTORY_RETENTION_DAYS * 86400000) } } }),
  ]);
  return { logs: logs.count, requests: requests.count, heartbeats: heartbeats.count };
}
