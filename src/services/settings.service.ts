import type { Prisma } from '@prisma/client';
import * as repository from '../repositories/settings.repository.js';
import { getRobot } from './robot.service.js';

export async function getSettings(robotId: string) { await getRobot(robotId); return repository.getOrCreateDefaults(robotId); }
export async function updateSettings(robotId: string, data: Prisma.RobotSettingsUpdateInput, changedBy?: string, source = 'API') {
  const previous = await getSettings(robotId);
  const updated = await repository.updateSettings(robotId, data);
  await repository.appendHistory(robotId, JSON.parse(JSON.stringify(previous)), JSON.parse(JSON.stringify(updated)), changedBy, source);
  return updated;
}
