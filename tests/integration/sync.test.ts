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

describe('account and trading synchronization', () => {
  it('synchronizes account, positions, orders, and trades', async () => {
    if (!ready) return;
    const app = createApp();
    const token = await registerTestRobot(app);
    const headers = mt5Headers('test-robot', '10001', token);
    const account = {
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
      maxDrawdownPercent: 0,
      autoTradingEnabled: true,
      terminalConnected: true,
      brokerConnected: true,
    };
    expect((await request(app).post('/api/mt5/account/sync').set(headers).send(account)).status).toBe(
      200,
    );
    expect(
      (
        await request(app)
          .post('/api/mt5/positions/sync')
          .set(headers)
          .send([
            {
              brokerPositionId: 'p1',
              symbol: 'EURUSD',
              direction: 'BUY',
              volume: 0.1,
              openPrice: 1.1,
            },
          ])
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/mt5/orders/sync')
          .set(headers)
          .send([
            {
              brokerOrderId: 'o1',
              symbol: 'EURUSD',
              orderType: 'BUY_LIMIT',
              volume: 0.1,
              requestedPrice: 1.09,
            },
          ])
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/mt5/trades/sync')
          .set(headers)
          .send([
            {
              brokerDealId: 'd1',
              symbol: 'EURUSD',
              direction: 'BUY',
              volume: 0.1,
              openPrice: 1.1,
              closePrice: 1.11,
              closedAt: new Date().toISOString(),
            },
          ])
      ).status,
    ).toBe(200);
  });
});
