# Deployment guide

## Prerequisites

Use Node 20+, PostgreSQL, HTTPS, and production-only random secrets. Set every variable in `.env.example`; generate `ENCRYPTION_KEY` with `openssl rand -hex 32`. Set `ALLOWED_ORIGINS` to the actual Base44 origin and `TRUST_PROXY=true` behind Render, Railway, or Nginx. The required non-default values are `DATABASE_URL`, `BASE44_API_KEY`, `MT5_ROBOT_API_KEY`, `INTERNAL_ADMIN_API_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY`, and `ALLOWED_ORIGINS`; `BASE44_HMAC_SECRET` is also required when `ENABLE_HMAC_VALIDATION=true`.

## Docker

```sh
cp .env.example .env
docker compose up --build -d
curl http://localhost:8080/health/ready
```

The image runs `prisma migrate deploy` by default. Set `RUN_MIGRATIONS=false` only when migrations are run by a single separate release job. `deployment/docker-compose.production.yml` starts an image and Nginx; terminate TLS at a managed load balancer or extend it with Certbot certificates.

## Render and Railway

On Render, create from `deployment/render.yaml`, enter all secret values manually, and set `ENCRYPTION_KEY` to a 64-character hex secret (not an auto-generated generic value). On Railway, add a PostgreSQL service, set `DATABASE_URL` from it, add the environment variables above plus `TRUST_PROXY=true`, and deploy using `deployment/railway.json`. Validate `/health/live`, then `/health/ready`.

## Ubuntu, Oracle, or DigitalOcean VPS

Install Docker Engine and Compose, clone the release, place a root-readable `.env` with mode `600`, and run the production Compose file. Point DNS at the VPS. For a host Nginx/PM2 install, build with `npm ci && npm run build`, run `npx prisma migrate deploy` once, and start `pm2 start deployment/ecosystem.config.cjs --env production`; configure Nginx to proxy to `127.0.0.1:8080` (replace the Compose upstream in `nginx.conf` accordingly).

Use Certbot with Nginx (`certbot --nginx -d api.example.com`) or a provider-managed certificate. Force HTTPS, renew automatically, and allow firewall ports 80/443 only; keep PostgreSQL private.

## Backups, migrations, rollback

Take a logical backup before each release:
```sh
pg_dump "$DATABASE_URL" --format=custom --file="flouba-$(date +%F-%H%M).dump"
```
Encrypt and store backups off-host; periodically test `pg_restore --clean --dbname="$RESTORE_URL" backup.dump`. Apply only committed Prisma migrations with `prisma migrate deploy`; never use `db push` in production.

Deploy an immutable image/tag, run migrations once, wait for readiness, then switch traffic. Roll back application code by redeploying the prior image. Database migrations must be backward compatible until the rollback window expires; restoring a backup is the rollback for a destructive schema/data migration and requires a maintenance window.
