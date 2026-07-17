# Flouba Lite Backend

Production Express/Prisma bridge between Base44 server functions and MetaTrader 5 robots. It authenticates callers, validates trading risk, queues commands, tracks robot state, and synchronizes account/trading data.

## Quick start

```sh
cp .env.example .env
npm install
npm run db:push
npm run dev
```

For a local container stack, run `docker compose up --build`. The service is live at `GET /health`; readiness including PostgreSQL is `GET /health/ready`.

## Documentation

- [API documentation](docs/API_DOCUMENTATION.md)
- [Base44 integration](docs/BASE44_INTEGRATION_GUIDE.md)
- [MT5 integration](docs/MT5_INTEGRATION_GUIDE.md)
- [Deployment](docs/DEPLOYMENT_GUIDE.md)
- [Security](docs/SECURITY_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Commands

`npm run build`, `npm run typecheck`, `npm test`, and `npm run start:prod` build, validate, test, and run the production service. Tests using PostgreSQL default to `postgresql://flouba:flouba@localhost:5432/flouba_lite_test`.

This software controls trading integrations. Test on a demo account and review risk settings before any production use.
