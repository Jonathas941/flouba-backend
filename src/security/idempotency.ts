import { createHash } from 'node:crypto';

export function buildIdempotencyScope(parts: {
  actorType: string;
  robotId?: string;
  path: string;
}): string {
  return [parts.actorType, parts.robotId ?? 'global', parts.path].join(':');
}

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}
