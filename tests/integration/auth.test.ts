import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { base44Headers } from './helpers.js';

describe('Base44 authentication', () => {
  it('rejects missing authentication headers', async () => {
    const response = await request(createApp()).get('/api/base44/robots');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBeDefined();
  });

  it('rejects invalid Base44 API key', async () => {
    const response = await request(createApp())
      .get('/api/base44/robots')
      .set({
        'x-api-key': 'definitely-not-the-correct-base44-api-key-value',
        'x-request-id': randomUUID(),
        'x-timestamp': new Date().toISOString(),
      });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_API_KEY');
  });

  it('accepts valid Base44 headers through authentication', async () => {
    const response = await request(createApp()).get('/api/base44/health').set(base44Headers());
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('MT5 authentication', () => {
  it('rejects missing robot API key on register', async () => {
    const response = await request(createApp())
      .post('/api/mt5/register')
      .set({
        'x-robot-id': 'test-robot',
        'x-account-login': '10001',
        'x-request-id': randomUUID(),
        'x-timestamp': new Date().toISOString(),
      })
      .send({
        robotId: 'test-robot',
        robotName: 'Test',
        accountLogin: '10001',
      });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
