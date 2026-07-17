import { describe, expect, it } from 'vitest';
import { timingSafeEqualString } from '../../src/security/timing-safe-compare.js';

describe('timing-safe string comparison', () => {
  it('compares equal and different length values safely', () => {
    expect(timingSafeEqualString('same', 'same')).toBe(true);
    expect(timingSafeEqualString('same', 'different')).toBe(false);
    expect(timingSafeEqualString('a', 'bb')).toBe(false);
  });
});
