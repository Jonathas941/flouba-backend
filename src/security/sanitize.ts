const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|authorization|password|secret|token|encryption[_-]?key|database_url|jwt)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (typeof value === 'string') {
    if (value.startsWith('postgresql://') || value.startsWith('postgres://')) {
      return '[REDACTED_DATABASE_URL]';
    }
    if (value.length > 5000) {
      return `${value.slice(0, 200)}…[truncated]`;
    }
  }
  return value;
}

export function sanitizeForLog(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForLog(item));
  }
  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = redactValue(key, sanitizeForLog(value));
    }
    return result;
  }
  return input;
}

export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  return sanitizeForLog(headers) as Record<string, unknown>;
}
