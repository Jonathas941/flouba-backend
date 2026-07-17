import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { getLogger } from '../config/logger.js';
import { runDailyStatisticsJob } from './daily-statistics.job.js';
import { runExpiredCommandJob } from './expired-command.job.js';
import { runLogCleanupJob } from './log-cleanup.job.js';
import { runRobotOfflineJob } from './robot-offline.job.js';
import { runStaleCommandJob } from './stale-command.job.js';

const owner = `${process.pid}:${randomUUID()}`;

async function acquireLock(jobName: string): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getEnv().JOB_INTERVAL_SECONDS * 2000);

  try {
    await prisma.jobLock.upsert({
      where: { jobName },
      create: { jobName, lockedBy: owner, lockedAt: now, expiresAt },
      update: { lockedBy: owner, lockedAt: now, expiresAt },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

async function locked(name: string, fn: () => Promise<unknown>): Promise<void> {
  const acquired = await acquireLock(name);
  if (!acquired) {
    return;
  }
  try {
    await fn();
  } catch (error) {
    getLogger().error({ err: error, job: name }, 'Background job failed');
  }
}

export async function startJobs(): Promise<void> {
  // Clean up expired locks from previous runs
  await prisma.jobLock.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  const interval = getEnv().JOB_INTERVAL_SECONDS * 1000;
  const jobs: Array<[string, () => Promise<unknown>]> = [
    ['robot-offline', runRobotOfflineJob],
    ['stale-command', runStaleCommandJob],
    ['expired-command', runExpiredCommandJob],
    ['daily-statistics', runDailyStatisticsJob],
    ['log-cleanup', runLogCleanupJob],
  ];
  for (const [name, job] of jobs) {
    const run = (): void => {
      locked(name, job).catch((error: unknown) => {
        getLogger().error({ err: error, job: name }, 'Unhandled error in background job');
      });
    };
    // Defer the first invocation until after the current tick so the server
    // has a chance to finish starting up (bind to the port, pass health
    // checks, etc.) before any job work begins.
    setImmediate(run);
    setInterval(run, interval).unref();
  }
}
