# Troubleshooting

## Service will not start

Run `npm run typecheck` and inspect the first startup error. The environment parser requires every secret to meet its minimum length, a PostgreSQL URL, at least one allowed origin, and a 64-character hexadecimal `ENCRYPTION_KEY`. Verify `DATABASE_URL` is reachable from the application network.

## Readiness is failing

`/health/live` does not contact PostgreSQL; `/health/ready` does. Check database DNS, credentials, SSL requirements, connection limits, and whether `prisma migrate deploy` completed. Inspect `npx prisma migrate status` with the same `DATABASE_URL`.

## Base44 receives 401

Check that the call is server-side and sends `x-api-key`, a fresh `x-request-id`, and current ISO `x-timestamp`. Verify server clock synchronization and `BASE44_API_KEY`. For HMAC, sign the compact JSON body actually sent, use the path without query parameters, and ensure `ENABLE_HMAC_VALIDATION` and `BASE44_HMAC_SECRET` agree.

## MT5 cannot connect or gets 401/403

Allowlist the exact HTTPS origin in MT5 Expert Advisor options, confirm certificate trust, and check firewall/DNS. Send all identity headers; registration does not need a robot token, later calls do when a token exists. Ensure `x-account-login` matches the registered robot and that terminal time is accurate.

## Commands remain queued or delivered

Confirm heartbeats are current and `GET /api/mt5/commands` is polling with the robot headers. A delivered command needs `/acknowledge`, `/executing`, and `/result`. Check the EA’s durable command journal and server logs by `requestId`; do not resend an entry command with a new idempotency key unless intentionally creating a new trade.

## Command is rejected

Inspect `rejectionCode` and `rejectionReason`. Common causes are emergency stop, paused/offline robot, disconnected terminal/broker, disabled auto trading, stale heartbeat, symbol/lot/risk limits, missing stop loss, daily loss/drawdown, or margin/position limits. Correct the condition and issue a new command only after verifying broker state.

## Reverse proxy or WebSocket issues

Set `TRUST_PROXY=true` behind a proxy, pass `X-Forwarded-*` headers, and proxy Upgrade/Connection headers. Ensure the Nginx upstream points to `app:8080` in Compose or `127.0.0.1:8080` for PM2 on the host. Verify `ALLOWED_ORIGINS` uses the browser origin exactly.
