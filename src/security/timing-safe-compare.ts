import { timingSafeEqual } from 'node:crypto';

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    const max = Math.max(bufferA.length, bufferB.length);
    const paddedA = Buffer.alloc(max);
    const paddedB = Buffer.alloc(max);
    bufferA.copy(paddedA);
    bufferB.copy(paddedB);
    timingSafeEqual(paddedA, paddedB);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
