import { describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
vi.mock('../../src/config/database.js', () => ({
  prisma: { robot: { findUnique }, robotHeartbeat: { findFirst: vi.fn() }, openPosition: { count: vi.fn() } },
}));
const { validateCommand } = await import('../../src/services/risk.service.js');

describe('risk validation', () => {
  it('blocks an unknown robot', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(validateCommand({ robotId: 'missing', accountLogin: '1', commandType: 'OPEN_BUY', direction: 'BUY', lotSize: 0.1, stopLoss: 1 } as never))
      .resolves.toMatchObject({ allowed: false, code: 'ROBOT_NOT_FOUND' });
  });
  it('requires a robot even for control commands', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(validateCommand({ robotId: 'missing', accountLogin: '1', commandType: 'STOP_ROBOT' } as never))
      .resolves.toMatchObject({ allowed: false, code: 'ROBOT_NOT_FOUND' });
  });
});
