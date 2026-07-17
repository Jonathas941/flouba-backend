import type { RobotStatus, CommandStatus, CommandType, TradeDirection } from '@prisma/client';

export interface RobotRegistrationResult {
  robotId: string;
  registrationStatus: 'REGISTERED' | 'UPDATED';
  heartbeatIntervalSeconds: number;
  commandPollingIntervalSeconds: number;
  emergencyStopActive: boolean;
  serverTime: string;
  /** Returned only on registration/update response — store securely on the VPS; never log. */
  robotToken?: string;
}


export interface HeartbeatResponse {
  robotId: string;
  pendingCommandCount: number;
  emergencyStopActive: boolean;
  robotStatus: RobotStatus;
  configuration: {
    heartbeatIntervalSeconds: number;
    commandPollingIntervalSeconds: number;
    commandExpirationSeconds: number;
  };
  serverTime: string;
}

export interface RobotPublicView {
  robotId: string;
  robotName: string;
  accountLogin: string;
  status: RobotStatus;
  emergencyStopActive: boolean;
  autoTradingEnabled: boolean;
  terminalConnected: boolean;
  brokerConnected: boolean;
  lastHeartbeatAt: string | null;
  eaVersion: string | null;
  brokerName: string | null;
  brokerServer: string | null;
}

export type { RobotStatus, CommandStatus, CommandType, TradeDirection };
