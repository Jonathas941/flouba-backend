import { getLogger } from '../config/logger.js';

/**
 * Maps non-canonical MT5 EA field names to the canonical field names expected
 * by the heartbeat validator. Keys are matched case-insensitively.
 */
const HEARTBEAT_FIELD_ALIASES: Record<string, string> = {
  // Status
  status: 'robotStatus',
  auto_trading: 'autoTradingEnabled',
  terminal_ok: 'terminalConnected',
  broker_ok: 'brokerConnected',
  market_ok: 'marketConnected',

  // Account
  account_balance: 'balance',
  account_equity: 'equity',
  used_margin: 'margin',
  free_margin_value: 'freeMargin',
  margin_pct: 'marginLevel',

  // Profit
  profit: 'floatingProfit',
  daily_p: 'dailyProfit',
  daily_l: 'dailyLoss',
  net_daily: 'dailyNetProfit',
  dd_pct: 'drawdownPercent',
  max_dd_pct: 'maxDrawdownPercent',

  // Positions
  positions: 'openPositionCount',
  pending: 'pendingOrderCount',

  // Market
  spread: 'currentSpread',
  symbol: 'currentSymbol',
  session: 'tradingSession',

  // Technical
  timestamp: 'clientTimestamp',
  tick_time: 'lastTickTime',
  trade_time: 'lastTradeTime',
  version: 'eaVersion',
  term_version: 'terminalVersion',

  // Indicators
  ema: 'emaValue',
  ema20: 'ema20Value',
  ema50: 'ema50Value',
  ema200: 'ema200Value',
  ema_m15: 'emaM15Value',
  rsi: 'rsiValue',
  adx: 'adxValue',
  '+di': 'plusDI',
  '-di': 'minusDI',
  atr: 'atrValue',
  score: 'signalScore',
  signal: 'lastSignal',
};

const LOWERCASE_ALIAS_MAP = new Map<string, string>(
  Object.entries(HEARTBEAT_FIELD_ALIASES).map(([alias, canonical]) => [alias.toLowerCase(), canonical]),
);

/**
 * Normalizes a raw MT5 EA heartbeat payload by mapping known field aliases to
 * their canonical names. Unknown fields (e.g. "E-Stop") are stripped from the
 * output so that downstream validation only ever sees canonical fields.
 *
 * This function never logs field values (e.g. balance) - only the field
 * names that were remapped, to avoid leaking account data into logs.
 */
export function normalizeHeartbeatPayload(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const input = raw as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  const appliedAliases: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    const canonical = LOWERCASE_ALIAS_MAP.get(key.toLowerCase());
    if (canonical) {
      normalized[canonical] = value;
      if (canonical !== key) {
        appliedAliases.push(`${key}->${canonical}`);
      }
    }
    // Unknown fields (e.g. "E-Stop") are intentionally dropped here so the
    // heartbeat validator only ever receives known/canonical fields.
  }

  if (appliedAliases.length > 0) {
    getLogger().debug({ aliases: appliedAliases }, 'Normalized heartbeat payload field aliases');
  }

  return normalized;
}
