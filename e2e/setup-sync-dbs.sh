#!/usr/bin/env bash
# Idempotent setup for data-sync E2E tests.
# Creates test databases and a restricted user in both PostgreSQL and MySQL.
set -euo pipefail

PG_SUPER="flyxl"
PG_USER="postgres"
PG_READONLY="datazen_readonly"
PG_READONLY_PW="REDACTED_RO_PASSWORD"

MYSQL_USER="root"
MYSQL_READONLY="datazen_readonly"
MYSQL_READONLY_PW="REDACTED_RO_PASSWORD"

echo "=== PostgreSQL setup ==="

# Create test databases (postgres has CREATEDB)
for db in datazen_sync_src datazen_sync_tgt; do
  if psql -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    echo "  DB $db already exists"
  else
    createdb -U "$PG_USER" "$db"
    echo "  Created DB $db"
  fi
done

# Create restricted user (requires superuser)
if psql -U "$PG_SUPER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_READONLY'" | grep -q 1; then
  echo "  Role $PG_READONLY already exists"
else
  psql -U "$PG_SUPER" -d postgres -c "CREATE USER $PG_READONLY WITH PASSWORD '$PG_READONLY_PW';"
  echo "  Created role $PG_READONLY"
fi

# Grant connect on target DB + SELECT-only on public schema
psql -U "$PG_SUPER" -d datazen_sync_tgt <<'SQL'
GRANT CONNECT ON DATABASE datazen_sync_tgt TO datazen_readonly;
GRANT USAGE ON SCHEMA public TO datazen_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datazen_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datazen_readonly;
SQL
echo "  Granted read-only access on datazen_sync_tgt"

echo ""
echo "=== MySQL setup ==="

# Create test database
mysql -u "$MYSQL_USER" -e "CREATE DATABASE IF NOT EXISTS datazen_sync_mysql_tgt;"
echo "  Created DB datazen_sync_mysql_tgt"

# Create restricted user
mysql -u "$MYSQL_USER" <<SQL
CREATE USER IF NOT EXISTS '${MYSQL_READONLY}'@'localhost' IDENTIFIED BY '${MYSQL_READONLY_PW}';
GRANT SELECT ON datazen_sync_mysql_tgt.* TO '${MYSQL_READONLY}'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "  Created read-only user $MYSQL_READONLY"

echo ""
echo "=== Setup complete ==="
