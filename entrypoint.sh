#!/bin/sh

# Ensure all required subdirectories exist under the bind-mounted userdata/.
# The Dockerfile's RUN mkdir -p is shadowed by the volume mount on EC2,
# so this is the only reliable place to guarantee the directory structure.
mkdir -p /app/userdata/json \
         /app/userdata/qr \
         /app/userdata/persona \
         /app/userdata/mem \
         /app/userdata/chathistory \
         /app/userdata/img \
         /app/userdata/voice \
         /app/userdata/whatsapp

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
fi

# Create empty persona placeholders if missing so the bot does not fail
# existsSync checks on first boot. Replace these with real content via the dashboard.
for f in verticespersona-long.txt verticespersona-short.txt verticespersona-group.txt verticespersona-boss.txt verticespersona-coder-c.txt; do
  if [ ! -f "/app/userdata/persona/$f" ]; then
    touch "/app/userdata/persona/$f"
    echo "WARNING: /app/userdata/persona/$f was missing — empty placeholder created. Add real content via the dashboard."
  fi
done

# Create empty memory placeholders if missing
for f in verticesmemory-perm.txt verticesmemory-temp.txt; do
  if [ ! -f "/app/userdata/mem/$f" ]; then
    touch "/app/userdata/mem/$f"
  fi
done

exec "$@"
