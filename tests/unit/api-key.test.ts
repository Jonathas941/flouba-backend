import { describe, expect, it } from 'vitest';
import { buildHmacSignature, hashSha256, verifyApiKey, verifyHmacSignature } from '../../src/security/api-key.js';

describe('API key security', () => {
  it('verifies exact keys and hashes deterministically', () => {
    expect(verifyApiKey('key', 'key')).toBe(true);
    expect(verifyApiKey('other', 'key')).toBe(false);
    expect(hashSha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('builds and verifies request HMACs', () => {
    const input = { method: 'POST', path: '/api/base44/robots/a/start', timestamp: '2026-01-01T00:00:00.000Z', body: '{}', secret: 'secret' };
    const signature = buildHmacSignature(input);
    expect(verifyHmacSignature({ ...input, signature })).toBe(true);
    expect(verifyHmacSignature({ ...input, signature: `${signature}0` })).toBe(false);
  });
});
