# Flouba Lite Backend API

Base URL: `https://<host>`. JSON responses use `{ "success": true, "data": ..., "meta": { "requestId", "timestamp" } }`; failures use `{ "success": false, "error": { "code", "message", "details" }, "meta": ... }`.

## Authentication

Base44 routes require `x-api-key: BASE44_API_KEY`, `x-request-id` (unique UUID/string), and ISO-8601 `x-timestamp` within `REQUEST_TIMESTAMP_TOLERANCE_SECONDS`. When HMAC validation is enabled, also send `x-signature`, an HMAC-SHA256 hex digest over `METHOD\nPATH\nTIMESTAMP\nsha256(JSON body)` using `BASE44_HMAC_SECRET`.

MT5 routes require `x-robot-api-key: MT5_ROBOT_API_KEY`, `x-robot-id`, `x-account-login`, `x-request-id`, and `x-timestamp`. All MT5 routes after registration additionally require `x-robot-token` if one was issued during registration. Internal routes require `x-api-key: INTERNAL_ADMIN_API_KEY`.

## Health

| Method | Path | Auth | Response `data` |
|---|---|---|---|
| GET | `/health` | none | `{ status: "ok", version }` |
| GET | `/health/live` | none | `{ status: "alive" }` |
| GET | `/health/ready` | none | `{ status: "ready" }`; 503 if PostgreSQL is unavailable |

## Base44 API

All Base44 paths begin with `/api/base44`. List routes accept `offset` and `limit` (1–500); logs, heartbeats, trades, and commands are newest first.

| Method | Path | Body / query | Response `data` |
|---|---|---|---|
| GET | `/health` | — | health payload |
| GET | `/robots` | `offset`, `limit` | robots |
| GET | `/robots/:robotId` | — | robot |
| GET | `/robots/:robotId/status` | — | robot status and latest state |
| GET | `/robots/:robotId/account` | — | trading account |
| GET | `/robots/:robotId/heartbeat` | pagination | heartbeat history |
| GET | `/robots/:robotId/positions` | `includeStale=true` optional | open positions |
| GET | `/robots/:robotId/orders` | `includeStale=true` optional | pending orders |
| GET | `/robots/:robotId/trades` | pagination | closed trades |
| GET | `/robots/:robotId/commands` | pagination | commands |
| GET | `/robots/:robotId/logs` | pagination | robot logs |
| GET | `/robots/:robotId/settings` | — | robot settings |
| POST | `/robots/:robotId/commands` | command object below | created command (201) |
| POST | `/robots/:robotId/start` | optional metadata object | `START_ROBOT` command (201) |
| POST | `/robots/:robotId/stop` | optional metadata object | `STOP_ROBOT` command (201) |
| POST | `/robots/:robotId/pause` | optional metadata object | `PAUSE_ROBOT` command (201) |
| POST | `/robots/:robotId/resume` | optional metadata object | `RESUME_ROBOT` command (201) |
| POST | `/robots/:robotId/close-all` | optional metadata object | `CLOSE_ALL_POSITIONS` command (201) |
| POST | `/robots/:robotId/cancel-all-orders` | optional metadata object | cancel command (201) |
| POST | `/robots/:robotId/emergency-stop` | empty object | emergency state and stop command |
| POST | `/robots/:robotId/clear-emergency-stop` | empty object | cleared emergency state |
| POST | `/robots/:robotId/settings` | partial settings object | updated settings |

Create-command shape:
```json
{"commandType":"OPEN_BUY","symbol":"EURUSD","direction":"BUY","lotSize":0.1,"entryPrice":1.085,"stopLoss":1.08,"takeProfit":1.095,"riskPercent":1,"priority":"NORMAL","idempotencyKey":"ui-unique-id","metadata":{"source":"Base44"}}
```
`commandType` is one of `OPEN_BUY`, `OPEN_SELL`, pending-order, position/order modification, closing, trailing/breakeven, robot-control, emergency, settings, or sync command enums. `priority` is `LOW`, `NORMAL`, `HIGH`, or `CRITICAL`. Duplicate `idempotencyKey` values are scoped to a robot.

Settings accepts any non-empty subset of `autoTradingEnabled`, symbol lists, lot/risk/position/loss/drawdown/margin/spread limits, stop-loss and reward-risk controls, sessions, filters, trailing/breakeven/partial-close toggles, command and heartbeat timeouts, and `martingaleEnabled`.

## MT5 API

All paths begin with `/api/mt5`.

| Method | Path | Required body |
|---|---|---|
| POST | `/register` | `robotId`, `robotName`, `accountLogin`; optional broker/account/EA/platform/symbol/timeframe/magic metadata |
| POST | `/heartbeat` | `robotStatus`, connection/auto-trading booleans, balance/equity/margin/freeMargin/marginLevel/floating/daily profit/loss/net/drawdown, open/pending counts; optional tick/trade timestamps, spread, session/filter/version fields |
| GET | `/commands?limit=20` | —; returns up to 100 delivered commands |
| POST | `/commands/:commandId/acknowledge` | optional `{ "metadata": {} }` |
| POST | `/commands/:commandId/executing` | optional `{ "metadata": {} }` |
| POST | `/commands/:commandId/result` | `{ "success": true }` plus optional broker IDs, fill/pricing/costs, return code/message, timestamps, or error fields |
| POST | `/account/sync` | account snapshot fields |
| POST | `/positions/sync` | position collection |
| POST | `/orders/sync` | pending-order collection |
| POST | `/trades/sync` | closed-trade collection |

Use the exact synchronization field names from the relevant MT5 payload examples in `MT5_INTEGRATION_GUIDE.md`; requests are validated and malformed payloads return 400.

## Internal API

| Method | Path | Response |
|---|---|---|
| GET | `/api/internal/diagnostics` | database connectivity and time |
| POST | `/api/internal/jobs/:jobName/trigger` | runs a named background job (`robot-offline`, `stale-command`, `expired-command`, `daily-statistics`, `log-cleanup`) |
| GET | `/api/internal/security-events` | up to 200 recent security events |
| GET | `/api/internal/webhooks` | webhook events |
| GET | `/api/internal/webhooks/:webhookId` | one webhook event |
