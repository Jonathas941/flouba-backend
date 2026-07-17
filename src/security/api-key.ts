import { createHmac, createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { timingSafeEqualString } from './timing-safe-compare.js';

export function hashSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function createApiKeyHash(apiKey: string): string {
  return hashSha256(apiKey);
}

export function verifyApiKey(provided: string | undefined, expected: string): boolean {
  if (!provided) {
    return false;
  }
  return timingSafeEqualString(provided, expected);
}

export function buildHmacSignature(parts: {
  method: string;
  path: string;
  timestamp: string;
  body: string;
  secret: string;
}): string {
  const bodyHash = hashSha256(parts.body);
  const payload = `${parts.method.toUpperCase()}\n${parts.path}\n${parts.timestamp}\n${bodyHash}`;
  return createHmac('sha256', parts.secret).update(payload).digest('hex');
}

export function verifyHmacSignature(params: {
  method: string;
  path: string;
  timestamp: string;
  body: string;
  secret: string;
  signature: string;
}): boolean {
  const expected = buildHmacSignature(params);
  return timingSafeEqualString(params.signature, expected);
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function encrypt(plaintext: string): string {
  const key = Buffer.from(getEnv().ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted payload');
  }
  const key = Buffer.from(getEnv().ENCRYPTION_KEY, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
