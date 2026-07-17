import { AccountType } from '@prisma/client';
import { z } from 'zod';

export const robotRegistrationSchema = z.object({
  robotId: z.string().min(1).max(128),
  robotName: z.string().min(1).max(256),
  accountLogin: z.string().min(1).max(128),
  brokerName: z.string().max(256).optional(),
  brokerServer: z.string().max(256).optional(),
  accountCurrency: z.string().min(3).max(8).optional(),
  accountLeverage: z.coerce.number().int().positive().optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  eaVersion: z.string().max(128).optional(),
  terminalVersion: z.string().max(128).optional(),
  operatingSystem: z.string().max(128).optional(),
  vpsIdentifier: z.string().max(256).optional(),
  supportedSymbols: z.array(z.string().min(1)).max(500).default([]),
  supportedTimeframes: z.array(z.string().min(1)).max(100).default([]),
  magicNumber: z.coerce.number().int().optional(),
  autoTradingEnabled: z.boolean().optional(),
  terminalConnected: z.boolean().optional(),
  brokerConnected: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});

export type RobotRegistrationInput = z.infer<typeof robotRegistrationSchema>;

export const parseRobotRegistration = (input: unknown): RobotRegistrationInput =>
  robotRegistrationSchema.parse(input);
