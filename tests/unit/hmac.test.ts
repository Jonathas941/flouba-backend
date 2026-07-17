import { describe, expect, it } from 'vitest';
import { buildHmacSignature, verifyHmacSignature } from '../../src/security/api-key.js';

describe('HMAC request signing', () => {
  const input = { method: 'post', path: '/api/base44/robots/r/commands', timestamp: '2026-02-01T00:00:00.000Z', body: '{"a":1}', secret: 'a-secret' };
  it('is sensitive to signed fields', () => {
    const signature = buildHmacSignature(input);
    expect(verifyHmacSignature({ ...input, signature })).toBe(true);
    expect(verifyHmacSignature({ ...input, body: '{"a":2}', signature })).toBe(false);
    expect(verifyHmacSignature({ ...input, path: '/other', signature })).toBe(false);
  });
});
