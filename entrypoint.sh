#!/bin/sh

# Bootstrap .env from example if missing
if [ ! -f /app/userdata/.env ]; then
  cp /app/userdata/.env.example /app/userdata/.env
  echo "INFO: .env created from .env.example — fill in your API keys in userdata/.env then restart the container."
fi

# Generate AUTH_SECRET into userdata/.env once if the value is empty
if ! grep -qE '^AUTH_SECRET=[^[:space:]]' /app/userdata/.env; then
  AUTH_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" /app/userdata/.env
  echo "INFO: AUTH_SECRET generated and written to userdata/.env."
fiCreate empty persona placeholders if missing so the bot does not fail# existsSync checks on first boot. Replace these with real content via the dashboard.for f in verticespersona-long.txt verticespersona-short.txt verticespersona-group.txt verticespersona-boss.txt verticespersona-coder-c.txt; do  if [ ! -f "/app/userdata/persona/$f" ]; then    touch "/app/u

exec "$@"
