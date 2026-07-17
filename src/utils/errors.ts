export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: Record<string, unknown>;
  readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details: Record<string, unknown> = {},
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ROBOT_NOT_FOUND: 'ROBOT_NOT_FOUND',
  ROBOT_OFFLINE: 'ROBOT_OFFLINE',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  COMMAND_EXPIRED: 'COMMAND_EXPIRED',
  DUPLICATE_COMMAND: 'DUPLICATE_COMMAND',
  COMMAND_ALREADY_PROCESSED: 'COMMAND_ALREADY_PROCESSED',
  RISK_LIMIT_EXCEEDED: 'RISK_LIMIT_EXCEEDED',
  DAILY_LOSS_LIMIT_REACHED: 'DAILY_LOSS_LIMIT_REACHED',
  DRAWDOWN_LIMIT_REACHED: 'DRAWDOWN_LIMIT_REACHED',
  EMERGENCY_STOP_ACTIVE: 'EMERGENCY_STOP_ACTIVE',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
