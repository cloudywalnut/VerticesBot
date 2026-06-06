#!/bin/sh
if [ ! -f /app/userdata/.env ]; then
  cp /app/userdata/.env.example /app/userdata/.env
  echo "INFO: .env created from .env.example — fill in your API keys in userdata/.env then restart the container."
fi
exec "$@"
