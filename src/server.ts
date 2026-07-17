import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getEnv, loadEnv } from './config/env.js';
import { getLogger } from './config/logger.js';
import { startJobs } from './jobs/index.js';
import { createSocketServer } from './websocket/socket-server.js';

async function main(): Promise<void> {
  loadEnv();
  const env = getEnv();
  const logger = getLogger();
  const app = createApp();
  await connectDatabase();
  logger.info({ version: env.APP_VERSION, env: env.NODE_ENV }, 'Application starting');
  startJobs();
  const server = createServer(app);
  createSocketServer(server);
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Server listening'));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
