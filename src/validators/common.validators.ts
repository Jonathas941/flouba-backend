import { z } from 'zod';

export const emptyBodySchema = z.object({}).strict();

export function parseEmptyBody(input: unknown): void {
  emptyBodySchema.parse(input ?? {});
}
