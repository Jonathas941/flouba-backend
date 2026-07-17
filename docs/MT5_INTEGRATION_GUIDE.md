# MT5 integration guide

## Network and authentication

In MT5, configure **Tools → Options → Expert Advisors → Allow WebRequest for listed URL** with the exact HTTPS origin, such as `https://api.example.com`—no path or wildcard. The endpoint must use a publicly trusted TLS certificate.

Every request requires `x-robot-api-key`, `x-robot-id`, `x-account-login`, a fresh UUID `x-request-id`, and ISO-8601 `x-timestamp`. Registration returns a one-time `robotToken`; store it in protected EA/VPS configuration and send it as `x-robot-token` on subsequent authenticated MT5 calls. Never compile a production key or token into distributable source.

## Lifecycle and endpoints

1. `POST /api/mt5/register` on initialization or after replacing local identity.
2. `POST /api/mt5/heartbeat` every configured heartbeat interval, even with no ticks. Its response supplies the current polling interval, command expiration, and emergency-stop state.
3. `GET /api/mt5/commands?limit=20` at the configured poll interval. Persist every returned `commandId` before acknowledging it.
4. `POST /api/mt5/commands/{commandId}/acknowledge`, then `/executing` immediately before executing. Report exactly one final outcome to `/result`.
5. Periodically and after changes, sync `POST /api/mt5/account/sync`, `/positions/sync`, `/orders/sync`, and `/trades/sync`.

Registration payload:
```json
{"robotId":"mt5-demo-001","robotName":"EURUSD EA","accountLogin":"123456","brokerName":"Example","brokerServer":"Example-Demo","accountCurrency":"USD","accountType":"DEMO","eaVersion":"1.2.0","terminalVersion":"5.00","supportedSymbols":["EURUSD"],"supportedTimeframes":["M5"],"magicNumber":44001}
```

Heartbeat payload:
```json
{"robotStatus":"ONLINE","autoTradingEnabled":true,"terminalConnected":true,"brokerConnected":true,"marketConnected":true,"balance":10000,"equity":10025,"margin":100,"freeMargin":9925,"marginLevel":10025,"floatingProfit":25,"dailyProfit":25,"dailyLoss":0,"dailyNetProfit":25,"drawdownPercent":0.3,"openPositionCount":1,"pendingOrderCount":0,"currentSpread":12,"sessionAllowed":true,"newsFilterActive":false,"spreadFilterPassed":true,"riskStatus":"OK","clientTimestamp":"2026-01-01T12:00:00.000Z"}
```

A poll response's `data` is an array. Execute commands only while `expiresAt` is in the future:
```json
[{"commandId":"cmd_123","commandType":"OPEN_BUY","symbol":"EURUSD","direction":"BUY","lotSize":0.1,"stopLoss":1.08,"takeProfit":1.09,"priority":"NORMAL","expiresAt":"2026-01-01T12:05:00.000Z","metadata":{}}]
```

Acknowledgement and result payloads:
```json
{"acknowledged":true,"receivedAt":"2026-01-01T12:00:01.000Z","metadata":{"terminal":"MT5"}}
```
```json
{"success":true,"brokerOrderId":"1001","brokerPositionId":"2001","brokerTicket":"1001","symbol":"EURUSD","direction":"BUY","requestedLot":0.1,"executedLot":0.1,"requestedPrice":1.085,"executedPrice":1.0851,"spread":12,"executionDurationMs":180,"terminalTimestamp":"2026-01-01T12:00:02.000Z"}
```

Sync examples (the positions, orders, and trades endpoints accept arrays):
```json
{"balance":10000,"equity":10025,"margin":100,"freeMargin":9925,"marginLevel":10025,"floatingProfit":25,"dailyProfit":25,"dailyLoss":0,"dailyNetProfit":25,"drawdownPercent":0.3,"maxDrawdownPercent":0.3,"autoTradingEnabled":true,"terminalConnected":true,"brokerConnected":true}
```
```json
[{"brokerPositionId":"2001","symbol":"EURUSD","direction":"BUY","volume":0.1,"openPrice":1.085,"profit":25}]
```
```json
[{"brokerOrderId":"1002","symbol":"EURUSD","orderType":"BUY_LIMIT","volume":0.1,"requestedPrice":1.08}]
```
```json
[{"brokerDealId":"3001","brokerPositionId":"2001","symbol":"EURUSD","direction":"BUY","volume":0.1,"openPrice":1.085,"closePrice":1.086,"closedAt":"2026-01-01T12:10:00.000Z"}]
```

## Retries, duplicates, and expiration

Retry only transport failures with exponential backoff and jitter (for example 1, 2, 4, 8, then 16 seconds), using a new `x-request-id` and timestamp each attempt. Do not re-execute after an uncertain result: consult the durable local command journal and sync/poll state first. Persist command ID, broker ticket/position ID, and final outcome before uploading the result. The server requeues unacknowledged deliveries and expires queued, delivered, or acknowledged commands at `expiresAt`; discard an expired command locally and never execute it. The journal is the final duplicate-order protection.

## Emergency stop

When `EMERGENCY_STOP` arrives, immediately disable new entries, apply the command policy for positions, acknowledge it, report the outcome, and keep sending heartbeats. While emergency stop is active, do not execute delayed entry commands. Resume only after an explicit `CLEAR_EMERGENCY_STOP` or resume command and local terminal verification.

Treat 401/403 as a trading-configuration alarm and stop trade-capable requests. Respect 429 retry guidance. Never silently ignore a rejected command or failed result upload.
