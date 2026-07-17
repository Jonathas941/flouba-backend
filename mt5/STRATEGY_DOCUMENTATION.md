# Strategy documentation — Flouba Lite Elite EA

This EA preserves the core FloubaBridge reference strategy and adds professional risk controls plus Flouba Lite backend integration.

## Preserved reference concepts
1. **Velocity burst entry** — `velocity = currentBid - previousBid`. BUY when upward burst exceeds `Velocity_Burst_Points`; SELL on downward burst.
2. **EMA trend filter** — default `EMA50_ONLY` (BUY above EMA50, SELL below). Optional `EMA20_50` / `EMA20_50_200`.
3. **Basket take profit** — closes **local magic** positions when combined profit hits target (default 150 points). Does not close bridge/manual positions.
4. **Hard stop loss** — every local trade gets a stop (default 300 points). Missing SL is repaired on tick.
5. **Breakeven + trailing** — local defaults BE trigger 50 / lock 5; trail distance 50.
6. **Spread filter** — blocks new entries when spread exceeds max points (symbol point).
7. **Equity floor** — default 80% of balance blocks new local entries.
8. **Daily loss guard** — default 10 account-currency units from start-of-day baseline (persisted across restart).
9. **Optional recovery lot multiplication** — disabled by default; requires both enable flags; never described as guaranteed recovery.
10. **MTF market snapshot** — M5 primary, M15/M30/H1 confirmation data, Asian range, 20-candle high/low.
11. **Bridge position management** — breakeven / trailing SL / trailing TP for bridge-magic positions (one modification per position per tick).

## Operating modes
| Mode | Backend commands | Local auto trades | Signals |
|---|---|---|---|
| BRIDGE_ONLY | Yes (if allowed) | No | Optional |
| LOCAL_STRATEGY_ONLY | No | Yes (if allowed) | Optional |
| HYBRID | Yes | Yes | Yes |
| MANUAL_SIGNAL_ONLY | No auto | No auto | Yes |

## Magic separation
- Bridge trades: `Bridge_Magic` (default `20240101`)
- Local strategy: `Local_Strategy_Magic` (default `202612`)
These must differ. Basket/BE/trail for local strategy only manage local magic.

## Profiles
- **REFERENCE_CLASSIC** — closest to supplied FloubaBridge defaults; optional filters off.
- **CONSERVATIVE** — fewer positions, longer cooldown, ADX/M15 confirmations, recovery off.
- **BALANCED** — moderate filters.
- **AGGRESSIVE** — more signals allowed, but spread/SL/daily/equity/max-position protections remain on.
- **CUSTOM** — use inputs as set.

## Important non-claims
This documentation does **not** claim profitability. Strategy Tester or live demo results are not a guarantee of future results. Recovery lot multiplication increases risk and can accelerate losses.
