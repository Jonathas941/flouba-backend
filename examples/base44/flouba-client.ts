import { createHash, createHmac, randomUUID } from 'node:crypto';

type RequestOptions = { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string | number | boolean | undefined> };

function getSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

export async function floubaRequest(path: string, options: RequestOptions = {}) {
  const method = options.method ?? 'GET';
  const url = new URL(path, getSecret('FLOUBA_BACKEND_URL'));
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
  const body = JSON.stringify(options.body ?? {});
  const timestamp = new Date().toISOString();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': getSecret('FLOUBA_BASE44_API_KEY'),
    'x-request-id': randomUUID(),
    'x-timestamp': timestamp,
  };
  const hmacSecret = process.env.FLOUBA_HMAC_SECRET;
  if (hmacSecret) {
    const bodyHash = createHash('sha256').update(body).digest('hex');
    headers['x-signature'] = createHmac('sha256', hmacSecret).update(`${method}\n${url.pathname}\n${timestamp}\n${bodyHash}`).digest('hex');
  }
  const response = await fetch(url, { method, headers, body: method === 'POST' ? body : undefined });
  const payload = await response.json().catch(() => ({ success: false, error: { message: 'Invalid backend response' } }));
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? `Flouba request failed (${response.status})`);
  return payload.data;
}
