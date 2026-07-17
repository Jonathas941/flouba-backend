import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import {
  base44Headers,
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

describe('commands', () => {
  it('creates an idempotent control command and delivers it', async () => {
    if (!ready) return;
    const app = createApp();
    const token = await registerTestRobot(app);
    const headers = mt5Headers('test-robot', '10001', token);

    const created = await request(app)
      .post('/api/base44/robots/test-robot/start')
      .set(base44Headers())
      .set('x-idempotency-key', 'start-1')
      .send({});
    expect(created.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/base44/robots/test-robot/start')
      .set(base44Headers())
      .set('x-idempotency-key', 'start-1')
      .send({});
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.commandId).toBe(created.body.data.commandId);

    const polled = await request(app).get('/api/mt5/commands').set(headers);
    expect(polled.status).toBe(200);
    expect(
      polled.body.data.some(
        (command: { commandType: string }) => command.commandType === 'START_ROBOT',
      ),
    ).toBe(true);

    const commandId = created.body.data.commandId as string;
    const ack = await request(app)
      .post(`/api/mt5/commands/${commandId}/acknowledge`)
      .set(headers)
      .send({ robotId: 'test-robot', acknowledged: true, receivedAt: new Date().toISOString() });
    expect(ack.status).toBe(200);

    const executing = await request(app)
      .post(`/api/mt5/commands/${commandId}/executing`)
      .set(headers)
      .send({ robotId: 'test-robot' });
    expect(executing.status).toBe(200);

    const result = await request(app)
      .post(`/api/mt5/commands/${commandId}/result`)
      .set(headers)
      .send({
        commandId,
        robotId: 'test-robot',
        success: true,
        brokerMessage: 'ok',
        timestamp: new Date().toISOString(),
      });
    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe('COMPLETED');
  });

  it('rejects entry commands when robot is offline', async () => {
    if (!ready) return;
    const app = createApp();
    await registerTestRobot(app);

    const rejected = await request(app)
      .post('/api/base44/robots/test-robot/commands')
      .set(base44Headers())
      .send({
        commandType: 'OPEN_BUY',
        symbol: 'EURUSD',
        direction: 'BUY',
        lotSize: 0.1,
        stopLoss: 1.09,
        entryPrice: 1.1,
        takeProfit: 1.12,
      });

    expect(rejected.status).toBe(201);
    expect(rejected.body.data.status).toBe('REJECTED');
    expect(rejected.body.data.rejectionCode).toBe('ROBOT_OFFLINE');
  });
});
