import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/config/database.js';

export async function prepareDatabase(): Promise<boolean> {
  try {
    execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      stdio: 'ignore',
      env: process.env,
    });
    await prisma.$connect();
    return true;
  } catch {
    console.warn(
      `Integration tests skipped: PostgreSQL is unavailable at ${process.env.DATABASE_URL}`,
    );
    return false;
  }
}

export async function cleanDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "WebhookEvent", "IdempotencyRecord", "ApiRequestLog", "SecurityEvent", "AuditLog", "RobotLog", "DailyAccountStatistic", "TradeExecution", "TradeCommandStatusHistory", "TradeCommand", "ClosedTrade", "PendingOrder", "OpenPosition", "RobotHeartbeat", "RobotSettingsHistory", "RobotSettings", "TradingAccount", "RiskRule", "JobLock", "Robot" CASCADE',
  );
}

export function base44Headers() {
  return {
    'x-api-key': process.env.BASE44_API_KEY!,
    'x-request-id': randomUUID(),
    'x-timestamp': new Date().toISOString(),
  };
}

export function mt5Headers(
  robotId = 'test-robot',
  accountLogin = '10001',
  robotToken?: string,
) {
  return {
    'x-robot-api-key': process.env.MT5_ROBOT_API_KEY!,
    'x-robot-id': robotId,
    'x-account-login': accountLogin,
    'x-request-id': randomUUID(),
    'x-timestamp': new Date().toISOString(),
    ...(robotToken ? { 'x-robot-token': robotToken } : {}),
  };
}

export const registration = {
  robotId: 'test-robot',
  robotName: 'Test Robot',
  accountLogin: '10001',
  accountType: 'DEMO' as const,
};

export async function registerTestRobot(app: Express): Promise<string> {
  const response = await request(app)
    .post('/api/mt5/register')
    .set(mt5Headers())
    .send(registration);
  if (response.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.robotToken as string;
}
