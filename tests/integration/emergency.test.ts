import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import {
  base44Headers,
  cleanDatabase,
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

describe('emergency stop', () => {
  it('activates the robot emergency-stop state', async () => {
    if (!ready) return;
    const app = createApp();
    await registerTestRobot(app);
    const response = await request(app)
      .post('/api/base44/robots/test-robot/emergency-stop')
      .set(base44Headers())
      .send({});
    expect(response.status).toBe(200);
    const status = await request(app)
      .get('/api/base44/robots/test-robot/status')
      .set(base44Headers());
    expect(status.body.data.emergencyStopActive).toBe(true);
  });
});
