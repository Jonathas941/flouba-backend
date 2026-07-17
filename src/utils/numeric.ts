import { Prisma } from '@prisma/client';

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const maybe = value as { toNumber: () => number };
    const n = maybe.toNumber();
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function toDecimal(value: number | string | Prisma.Decimal | Prisma.DecimalJsLike | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(typeof value === 'object' ? toNumber(value) : value);
}

export function decimalOrZero(value: number | string | Prisma.Decimal | Prisma.DecimalJsLike | null | undefined): Prisma.Decimal {
  return toDecimal(value) ?? new Prisma.Decimal(0);
}

export function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
