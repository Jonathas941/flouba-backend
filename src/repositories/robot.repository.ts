import type { Prisma, RobotStatus } from '@prisma/client';
import { prisma } from '../config/database.js';

export async function findByRobotId(robotId: string) {
  return prisma.robot.findUnique({ where: { robotId }, include: { tradingAccount: true, settings: true } });
}

export async function upsertRegistration(
  robotId: string,
  data: Omit<Prisma.RobotUncheckedCreateInput, 'robotId'>,
) {
  return prisma.robot.upsert({
    where: { robotId },
    create: { ...data, robotId },
    update: {
      robotName: data.robotName,
      accountLogin: data.accountLogin,
      brokerName: data.brokerName,
      brokerServer: data.brokerServer,
      accountCurrency: data.accountCurrency,
      accountLeverage: data.accountLeverage,
      accountType: data.accountType,
      eaVersion: data.eaVersion,
      terminalVersion: data.terminalVersion,
      operatingSystem: data.operatingSystem,
      vpsIdentifier: data.vpsIdentifier,
      supportedSymbols: data.supportedSymbols,
      supportedTimeframes: data.supportedTimeframes,
      magicNumber: data.magicNumber,
      autoTradingEnabled: data.autoTradingEnabled,
      terminalConnected: data.terminalConnected,
      brokerConnected: data.brokerConnected,
      marketConnected: data.marketConnected,
      robotTokenHash: data.robotTokenHash,
      deletedAt: null,
      lastSeenAt: new Date(),
    },
  });
}

export async function updateStatus(robotId: string, status: RobotStatus, data: Prisma.RobotUpdateInput = {}) {
  return prisma.robot.update({ where: { robotId }, data: { ...data, status, lastSeenAt: new Date() } });
}

export async function markOfflineStale(before: Date) {
  return prisma.robot.updateMany({
    where: {
      deletedAt: null,
      status: { in: ['ONLINE', 'REGISTERING'] },
      OR: [
        { lastHeartbeatAt: { lt: before } },
        { lastHeartbeatAt: null, registeredAt: { lt: before } },
      ],
    },
    data: { status: 'OFFLINE', terminalConnected: false, brokerConnected: false, marketConnected: false },
  });
}

export async function listRobots(args: { skip?: number; take?: number; status?: RobotStatus } = {}) {
  const where: Prisma.RobotWhereInput = { deletedAt: null, ...(args.status ? { status: args.status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.robot.findMany({ where, include: { tradingAccount: true }, orderBy: { createdAt: 'desc' }, skip: args.skip, take: args.take }),
    prisma.robot.count({ where }),
  ]);
  return { items, total };
}
