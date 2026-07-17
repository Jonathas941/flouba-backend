import { describe, expect, it } from 'vitest';
import { sanitizeForLog } from '../../src/security/sanitize.js';

describe('log sanitization', () => {
  it('redacts nested secrets and database URLs', () => {
    expect(sanitizeForLog({ apiKey: 'secret', nested: { password: 'p' }, url: 'postgresql://user:pass@host/db' }))
      .toEqual({ apiKey: '[REDACTED]', nested: { password: '[REDACTED]' }, url: '[REDACTED_DATABASE_URL]' });
  });
});
