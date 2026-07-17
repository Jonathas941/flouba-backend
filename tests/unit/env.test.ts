import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv, resetEnvCache } from '../../src/config/env.js';

afterEach(resetEnvCache);
describe('environment validation', () => {
  it('parses valid test environment', () => expect(loadEnv()).toMatchObject({ NODE_ENV: 'test', PORT: 8080 }));
  it('rejects an invalid encryption key', () => expect(() => loadEnv({ ...process.env, ENCRYPTION_KEY: 'not-hex' })).toThrow('ENCRYPTION_KEY'));
});
