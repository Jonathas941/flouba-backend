export function nowUtc(): Date {
  return new Date();
}

export function toIso(date: Date | string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  return new Date(date).toISOString();
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function isExpired(date: Date | null | undefined, now: Date = nowUtc()): boolean {
  if (!date) {
    return false;
  }
  return date.getTime() <= now.getTime();
}

export function startOfUtcDay(date: Date = nowUtc()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseOptionalDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}
