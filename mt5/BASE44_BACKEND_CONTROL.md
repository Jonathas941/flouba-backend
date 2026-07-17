# Base44 / backend control — Flouba Lite Elite EA

## Architecture
```text
Base44 frontend
  → Base44 backend functions (secrets stay server-side)
    → Flouba Lite Node backend
      → MT5 EA (this file)
```

Base44 must never call the MT5 EA directly and must never expose `MT5_ROBOT_API_KEY` or `FLOUBA_BASE44_API_KEY` to the browser.

## EA ↔ backend protocol
The EA uses:
- `POST /api/mt5/register`
- `POST /api/mt5/heartbeat` (includes optional `lastSignal` / indicators)
- `GET /api/mt5/commands`
- `POST /api/mt5/commands/:id/acknowledge|executing|result`
- `POST /api/mt5/account/sync`
- `POST /api/mt5/positions/sync`
- `POST /api/mt5/orders/sync`
- `POST /api/mt5/trades/sync`

Auth headers: `x-robot-api-key`, `x-robot-id`, `x-account-login`, `x-request-id`, `x-timestamp`, and `x-robot-token` after registration.

## Commands Base44 can issue (via Flouba backend)
Create durable commands with Base44 server functions (see `examples/base44/`):

| Intent | Command type |
|---|---|
| Start | `START_ROBOT` |
| Stop | `STOP_ROBOT` |
| Pause | `PAUSE_ROBOT` |
| Resume | `RESUME_ROBOT` |
| Emergency stop | `EMERGENCY_STOP` |
| Clear emergency stop | `CLEAR_EMERGENCY_STOP` |
| Close bridge positions | `CLOSE_ALL_POSITIONS` (EA closes bridge magic by default) |
| Close one position | `CLOSE_POSITION` |
| Open bridge trade | `OPEN_BUY` / `OPEN_SELL` |
| Update safe settings | `UPDATE_ROBOT_SETTINGS` |
| Sync request | `SYNC_ACCOUNT` / `SYNC_POSITIONS` / `SYNC_ORDERS` / `SYNC_TRADES` |

## Dangerous remote settings
Remote attempts to enable recovery lot multiplication are ignored unless:
```text
Allow_Remote_Dangerous_Settings = true
```
Default is `false`.

## Signals without auto-execution
In `MANUAL_SIGNAL_ONLY` (default) or `HYBRID`, local analysis can populate `lastSignal` inside heartbeat so Base44 can display:
- direction / reason summary
- EMA / ADX / RSI / ATR snapshot
- score and rejection codes (throttled)

Auto trading still requires explicit enable flags and `Dry_Run = false`.

## Magic ownership reminder
Dashboard “close all local” workflows should target local magic only. Bridge close-all must not wipe unrelated manual trades unless the EA input `Include_Manual_Positions_In_Limits` / close-all policy is intentionally enabled.
