import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { runRobotOfflineJob } from '../../src/jobs/robot-offline.job.js';
import {
  base44Headers,
  cleanDatabase,
  mt5Headers,
  prepareDatabase,
  registerTestRobot,
} from './helpers.js';

let ready = false;

const heartbeatBody = {
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
  sessionAllowed: true,
  newsFilterActive: false,
  spreadFilterPassed: true,
  riskStatus: 'OK',
};

beforeAll(async () => {
  ready = await prepareDatabase();
});

beforeEach(async () => {
  if (ready) await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('emergency stop risk gates', () => {
  it('blocks entry commands and still queues close-all', async () => {
    if (!ready) return;
    const app = createApp();
    const token = await registerTestRobot(app);
    const headers = mt5Headers('test-robot', '10001', token);
    await request(app).post('/api/mt5/heartbeat').set(headers).send(heartbeatBody);

    const stop = await request(app)
      .post('/api/base44/robots/test-robot/emergency-stop')
      .set(base44Headers())
      .send({});
    expect(stop.status).toBe(200);

    const entry = await request(app)
      .post('/api/base44/robots/test-robot/commands')
      .set(base44Headers())
      .send({
        commandType: 'OPEN_BUY',
        symbol: 'EURUSD',
        direction: 'BUY',
        lotSize: 0.1,
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
      });
    expect(entry.status).toBe(201);
    expect(entry.body.data.status).toBe('REJECTED');
    expect(entry.body.data.rejectionCode).toBe('EMERGENCY_STOP_ACTIVE');

    const closeAll = await request(app)
      .post('/api/base44/robots/test-robot/close-all')
      .set(base44Headers())
      .send({});
    expect(closeAll.status).toBe(201);
    expect(closeAll.body.data.status).toBe('QUEUED');
    expect(closeAll.body.data.commandType).toBe('CLOSE_ALL_POSITIONS');
  });
});

describe('robot offline job', () => {
  it('marks robots offline after heartbeat timeout', async () => {
    if (!ready) return;
    const app = createApp();
    const token = await registerTestRobot(app);
    await request(app)
      .post('/api/mt5/heartbeat')
      .set(mt5Headers('test-robot', '10001', token))
      .send(heartbeatBody);

    await prisma.robot.update({
      where: { robotId: 'test-robot' },
      data: { lastHeartbeatAt: new Date(Date.now() - 120_000) },
    });

    await runRobotOfflineJob();
    const robot = await prisma.robot.findUniqueOrThrow({ where: { robotId: 'test-robot' } });
    expect(robot.status).toBe('OFFLINE');
    expect(robot.terminalConnected).toBe(false);
  });
});
