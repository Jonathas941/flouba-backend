# Security guide

## Secret handling

Store `BASE44_API_KEY`, `MT5_ROBOT_API_KEY`, `INTERNAL_ADMIN_API_KEY`, `BASE44_HMAC_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY`, and `DATABASE_URL` only in the deployment secret store or protected server environment. Do not commit `.env`, embed them in MT5 source, expose them to a browser, or log them. Use separate values per environment and rotate immediately after suspected disclosure.

`ENCRYPTION_KEY` is exactly 64 hexadecimal characters and must be backed up securely: losing it prevents decrypting existing encrypted data. Use a password manager or cloud KMS for secret distribution and restrict production access.

## Transport and request integrity

Serve only HTTPS, enable HSTS at the edge, and use a valid public certificate for MT5 WebRequest. Restrict CORS using `ALLOWED_ORIGINS`; do not use `*`. Each authenticated request needs a fresh timestamp and request ID. Enable HMAC for Base44 production calls; body serialization must match the signed body exactly.

## Access control and operations

- Use least-privilege database users and private database networking.
- Keep `/api/internal` inaccessible to untrusted callers and rotate its key independently.
- Review audit logs and security events; alert on repeated 401/403, request-expiry, and emergency-stop events.
- Restrict deployment credentials, use MFA, patch Node/OS/dependencies, and run vulnerability scans.
- Rate limits reduce abuse but are not authorization; preserve application authorization in Base44.
- Back up PostgreSQL encrypted at rest and test restoration.

## Trading safety

Risk validation and emergency stop are defense-in-depth controls, not a guarantee against execution, broker, market, or network loss. Set conservative lot/loss/drawdown/margin limits, require stop losses where appropriate, and test on demo accounts. The EA must durably deduplicate command IDs and refuse entries during an emergency stop.

## Incident response

Disable affected keys, activate emergency stop for impacted robots, preserve logs/audit records, rotate secrets, and investigate the request IDs. Reconcile broker history against synchronized trades before resuming trading.
