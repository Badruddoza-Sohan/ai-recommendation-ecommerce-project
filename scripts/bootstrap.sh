#!/usr/bin/env bash
set -euo pipefail
echo "Bootstrap: create .env, install deps, run DB init and start dev server"
if [ -f .env ]; then
  echo ".env already exists — skipping creation"
else
  read -r -p "Enter MySQL root password to use for DATABASE_URL (will not be stored securely): " MYSQL_PASS
  APP_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .env <<EOF
DATABASE_URL=mysql://root:${MYSQL_PASS}@localhost:3306/ecommerce_db
APP_SECRET=${APP_SECRET}
NODE_ENV=development
EOF
  echo ".env created"
fi

echo "Installing dependencies (npm ci)..."
npm ci

echo "Running DB init (seed) and starting dev server..."
npm run dev:all
