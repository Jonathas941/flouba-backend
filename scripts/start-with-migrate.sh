#!/bin/sh
set -eu

echo "Starting Flouba Lite backend (NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-unset})"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "Migrations complete."
fi

echo "Launching node dist/server.js..."
exec node dist/server.js
