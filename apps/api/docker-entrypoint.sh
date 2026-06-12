#!/bin/sh
set -e

echo "Enabling pg_trgm extension..."
./node_modules/.bin/prisma db execute \
  --schema=./libs/database/prisma/schema.prisma \
  --stdin <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SQL

echo "Pushing database schema..."
./node_modules/.bin/prisma db push \
  --schema=./libs/database/prisma/schema.prisma \
  --skip-generate

echo "Starting API..."
exec node dist/apps/api/src/main.js
