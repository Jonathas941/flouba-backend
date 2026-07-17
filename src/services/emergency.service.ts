import { prisma } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { createCommand } from './command.service.js';
import { recordSecurityEvent } from './security-event.service.js';
import { emitEmergency } from '../websocket/robot-events.js';

export async function activateEmergencyStop(robotId: string, actorId?: string) {
  const robot = await prisma.robot.findUnique({ where: { robotId } });
  if (!robot) throw new AppError(ErrorCodes.ROBOT_NOT_FOUND, 'Robot not found', 404);
  const now = new Date();
  await prisma.$transaction([prisma.robot.update({ where: { robotId }, data: { emergencyStopActive: true, emergencyStopAt: now, emergencyStopBy: actorId, status: 'EMERGENCY_STOPPED' } }), prisma.robotSettings.upsert({ where: { robotId }, create: { robotId, emergencyStopActive: true }, update: { emergencyStopActive: true } })]);
  const command = await createCommand({ robotId, commandType: 'EMERGENCY_STOP', priority: 'CRITICAL', createdBy: actorId });
  await recordSecurityEvent({ eventType: 'EMERGENCY_STOP_ACTIVATED', severity: 'CRITICAL', message: 'Emergency stop activated', robotId, actorType: 'internal', actorId });
  emitEmergency(robotId, { robotId, active: true, at: now.toISOString(), actorId });
  return command;
}
export async function clearEmergencyStop(robotId: string, actorId?: string) {
  const robot = await prisma.robot.findUnique({ where: { robotId } });
  if (!robot) throw new AppError(ErrorCodes.ROBOT_NOT_FOUND, 'Robot not found', 404);
  await prisma.$transaction([prisma.robot.update({ where: { robotId }, data: { emergencyStopActive: false, emergencyStopAt: null, emergencyStopBy: null, status: 'STOPPED' } }), prisma.robotSettings.upsert({ where: { robotId }, create: { robotId, emergencyStopActive: false }, update: { emergencyStopActive: false } })]);
  const command = await createCommand({ robotId, commandType: 'CLEAR_EMERGENCY_STOP', priority: 'CRITICAL', createdBy: actorId });
  await recordSecurityEvent({ eventType: 'EMERGENCY_STOP_CLEARED', severity: 'WARNING', message: 'Emergency stop cleared; robot remains stopped until explicitly started', robotId, actorType: 'internal', actorId });
  emitEmergency(robotId, { robotId, active: false, actorId });
  return command;
}
