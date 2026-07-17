# Base44 integration guide

Base44 must call this backend only from a server-side backend function. Never put backend URLs containing private paths, `FLOUBA_BASE44_API_KEY`, or `FLOUBA_HMAC_SECRET` in browser code, client variables, page props, logs, or error messages.

## Configure secrets

Create these Base44 server secrets:

| Secret | Value |
|---|---|
| `FLOUBA_BACKEND_URL` | HTTPS origin, for example `https://api.example.com` |
| `FLOUBA_BASE44_API_KEY` | backend `BASE44_API_KEY` |
| `FLOUBA_HMAC_SECRET` | backend `BASE44_HMAC_SECRET`; required only when HMAC validation is enabled |

Keep `ENABLE_HMAC_VALIDATION=true` and both HMAC secrets in sync for production. Rotate a secret by deploying the backend with the new value and then updating the Base44 secret immediately; allow only a planned, short maintenance window because the backend supports one active secret.

## Call flow

1. Browser invokes a Base44 backend function with only user input and robot ID.
2. The backend function validates authorization in Base44, builds the request, and reads server secrets.
3. It sends `x-api-key`, a fresh `x-request-id`, an ISO `x-timestamp`, and optional `x-signature`.
4. Flouba validates the timestamp, key, optional signature, and command risk rules.
5. The function returns a deliberately limited response to the browser; do not forward headers, secrets, or internal diagnostic errors.

Use the functions in `examples/base44/` as pasteable server-side templates. They make no direct browser calls and serialize the exact body before HMAC signing.

## Operational rules

- Generate a new request ID for every request, including retries.
- Preserve `idempotencyKey` when retrying command creation; this prevents duplicate trade commands.
- Treat a `201` command response as queued, not executed. Read command state or robot status for confirmation.
- Display `requestId` from the response when reporting support incidents.
- Restrict Base44 functions to authenticated, authorized users and enforce a robot ownership check before forwarding a robot ID.
