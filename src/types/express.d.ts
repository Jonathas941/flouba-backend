import type { Robot } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      actorType?: 'base44' | 'mt5' | 'internal' | 'public';
      robot?: Robot;
      robotId?: string;
      accountLogin?: string;
    }

    interface Locals {
      requestId: string;
      startTime: number;
    }
  }
}

export {};
