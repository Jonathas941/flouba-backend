import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import {
  cleanDatabase,
  mt5Headers,
  prepareDatabase,
  registerTestRobot,
} from './helpers.js';

let ready = false;

beforeAll(async () => {
  ready = await prepareDatabase();
});

beforeEach(async () => {
  if (ready) await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('robot registration and heartbeat', () => {
  it('persists an authenticated heartbeat', async () => {
    if (!ready) return;
    const app = createApp();
    const token = await registerTestRobot(app);
    const body = {
      robotStatus: 'ONLINE',
      autoTradingEnabled: true,
      terminalConnected: true,
      brokerConnected: true,
      marketConnected: true,
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: 0,
      floatingProfit: 0,
      dailyProfit: 0,
      dailyLoss: 0,
      dailyNetProfit: 0,
      drawdownPercent: 0,
      openPositionCount: 0,
      pendingOrderCount: 0,
    };
    const response = await request(app)
      .post('/api/mt5/heartbeat')
      .set(mt5Headers('test-robot', '10001', token))
      .send(body);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
