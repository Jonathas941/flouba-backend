/**
 * Flouba Lite — Base44 backend function pack
 *
 * HOW TO USE IN BASE44
 * 1. Add server secrets (Settings → Secrets / Environment):
 *      FLOUBA_BACKEND_URL     = https://YOUR-BACKEND-HOST   (no trailing slash)
 *      FLOUBA_BASE44_API_KEY  = same value as backend BASE44_API_KEY
 *      FLOUBA_HMAC_SECRET     = optional; same as backend BASE44_HMAC_SECRET
 * 2. Create one Base44 backend function per export below, OR paste this whole
 *    module if Base44 supports shared server modules.
 * 3. From the Base44 frontend / actions, call ONLY these server functions.
 *    Never call FLOUBA_BACKEND_URL from browser code.
 *
 * SECURITY
 * - Secrets stay on the Base44 server.
 * - Frontend may pass robotId and user inputs only.
 * - Commands return queued status — not broker fill confirmation.
 */

type Json = Record<string, unknown>;

function secret(name: string): string {
  const fromDeno =
    typeof Deno !== 'undefined' ? (Deno.env.get(name) ?? undefined) : undefined;
  const value = fromDeno ?? process.env[name];
  if (!value) throw new Error(`Missing Base44 server secret: ${name}`);
  return value.replace(/\/$/, '');
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secretKey: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function floubaRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    idempotencyKey?: string;
  } = {},
): Promise<unknown> {
  const method = options.method ?? 'GET';
  const base = secret('FLOUBA_BACKEND_URL');
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${base}/`);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const bodyText = method === 'POST' ? JSON.stringify(options.body ?? {}) : '';
  const timestamp = new Date().toISOString();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': secret('FLOUBA_BASE44_API_KEY'),
    'x-request-id': uuid(),
    'x-timestamp': timestamp,
  };
  if (options.idempotencyKey) {
    headers['x-idempotency-key'] = options.idempotencyKey;
  }

  const hmacSecret =
    (typeof Deno !== 'undefined' ? Deno.env.get('FLOUBA_HMAC_SECRET') : undefined) ??
    process.env.FLOUBA_HMAC_SECRET;
  if (hmacSecret) {
    const bodyHash = await sha256Hex(bodyText || '{}');
    headers['x-signature'] = await hmacSha256Hex(
      hmacSecret,
      `${method}\n${url.pathname}\n${timestamp}\n${bodyHash}`,
    );
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? bodyText : undefined,
  });

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: unknown;
    error?: { code?: string; message?: string };
    meta?: { requestId?: string };
  } | null;

  if (!payload || payload.success !== true) {
    const message = payload?.error?.message ?? `Flouba request failed (${response.status})`;
    const err = new Error(message) as Error & { code?: string; requestId?: string };
    err.code = payload?.error?.code;
    err.requestId = payload?.meta?.requestId;
    throw err;
  }

  return payload.data;
}

function requireRobotId(robotId: string): string {
  if (!robotId || typeof robotId !== 'string') {
    throw new Error('robotId is required');
  }
  return robotId.trim();
}

// ─── Read APIs (safe for dashboard polling) ─────────────────────────

export async function getRobots() {
  return floubaRequest('/api/base44/robots');
}

export async function getRobotStatus(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/status`);
}

export async function getRobot(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}`);
}

export async function getAccountSummary(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/account`);
}

export async function getHeartbeat(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/heartbeat`);
}

export async function getOpenPositions(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/positions`);
}

export async function getPendingOrders(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/orders`);
}

export async function getClosedTrades(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/trades`);
}

export async function getCommands(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/commands`);
}

export async function getSettings(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/settings`);
}

export async function getBackendHealth() {
  return floubaRequest('/api/base44/health');
}

// ─── Control APIs (create durable commands — not instant fills) ─────

export async function startRobot(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/start`, {
    method: 'POST',
    body: {},
  });
}

export async function stopRobot(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/stop`, {
    method: 'POST',
    body: {},
  });
}

export async function pauseRobot(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/pause`, {
    method: 'POST',
    body: {},
  });
}

export async function resumeRobot(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/resume`, {
    method: 'POST',
    body: {},
  });
}

export async function emergencyStop(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/emergency-stop`, {
    method: 'POST',
    body: {},
  });
}

export async function clearEmergencyStop(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/clear-emergency-stop`, {
    method: 'POST',
    body: {},
  });
}

export async function closeAllPositions(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/close-all`, {
    method: 'POST',
    body: {},
  });
}

export async function cancelAllOrders(robotId: string) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/cancel-all-orders`, {
    method: 'POST',
    body: {},
  });
}

export async function updateRobotSettings(robotId: string, settings: Json) {
  const id = requireRobotId(robotId);
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/settings`, {
    method: 'POST',
    body: settings,
  });
}

export async function createTradeCommand(
  robotId: string,
  command: Json & { commandType: string; idempotencyKey?: string },
) {
  const id = requireRobotId(robotId);
  if (!command?.commandType) throw new Error('commandType is required');
  return floubaRequest(`/api/base44/robots/${encodeURIComponent(id)}/commands`, {
    method: 'POST',
    body: command,
    idempotencyKey:
      typeof command.idempotencyKey === 'string' ? command.idempotencyKey : undefined,
  });
}

/**
 * Suggested Base44 frontend wiring (pseudo):
 *
 *   // READ
 *   const status = await backend.getRobotStatus({ robotId })
 *   const account = await backend.getAccountSummary({ robotId })
 *   const positions = await backend.getOpenPositions({ robotId })
 *
 *   // CONTROL
 *   await backend.startRobot({ robotId })
 *   await backend.emergencyStop({ robotId })
 *
 * Always treat command responses as "queued", then refresh status/commands.
 */
