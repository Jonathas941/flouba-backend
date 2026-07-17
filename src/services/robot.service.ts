import type { Prisma, RobotStatus } from '@prisma/client';
import { getEnv } from '../config/env.js';
import { createApiKeyHash, generateToken } from '../security/api-key.js';
import { ErrorCodes, AppError } from '../utils/errors.js';
import * as robots from '../repositories/robot.repository.js';
import * as settings from '../repositories/settings.repository.js';
import type { RobotPublicView, RobotRegistrationResult } from '../types/robot.types.js';

export async function registerRobot(
  robotId: string,
  data: Omit<Prisma.RobotUncheckedCreateInput, 'robotId'>,
): Promise<RobotRegistrationResult> {
  const existing = await robots.findByRobotId(robotId);
  const robotToken = generateToken(32);
  const robot = await robots.upsertRegistration(robotId, {
    ...data,
    robotTokenHash: createApiKeyHash(robotToken),
  });
  await settings.getOrCreateDefaults(robotId);
  const env = getEnv();
  return {
    robotId: robot.robotId,
    registrationStatus: existing ? 'UPDATED' : 'REGISTERED',
    heartbeatIntervalSeconds: env.ROBOT_HEARTBEAT_INTERVAL_SECONDS,
    commandPollingIntervalSeconds: env.COMMAND_POLL_INTERVAL_SECONDS,
    emergencyStopActive: robot.emergencyStopActive,
    serverTime: new Date().toISOString(),
    robotToken,
  };
}

export async function getRobot(robotId: string) {
  const robot = await robots.findByRobotId(robotId);
  if (!robot || robot.deletedAt) {
    throw new AppError(ErrorCodes.ROBOT_NOT_FOUND, 'Robot not found', 404, { robotId });
  }
  return robot;
}

export async function listRobots(
  args: { skip?: number; take?: number; status?: RobotStatus } = {},
): Promise<{ items: RobotPublicView[]; total: number }> {
  const result = await robots.listRobots(args);
  return {
    total: result.total,
    items: result.items.map((r) => ({
      robotId: r.robotId,
      robotName: r.robotName,
      accountLogin: r.accountLogin,
      status: r.status,
      emergencyStopActive: r.emergencyStopActive,
      autoTradingEnabled: r.autoTradingEnabled,
      terminalConnected: r.terminalConnected,
      brokerConnected: r.brokerConnected,
      lastHeartbeatAt: r.lastHeartbeatAt?.toISOString() ?? null,
      eaVersion: r.eaVersion,
      brokerName: r.brokerName,
      brokerServer: r.brokerServer,
    })),
  };
}

export async function getRobotStatus(robotId: string) {
  const robot = await getRobot(robotId);
  return {
    robotId,
    status: robot.status,
    emergencyStopActive: robot.emergencyStopActive,
    lastHeartbeatAt: robot.lastHeartbeatAt,
    terminalConnected: robot.terminalConnected,
    brokerConnected: robot.brokerConnected,
    marketConnected: robot.marketConnected,
  };
}
