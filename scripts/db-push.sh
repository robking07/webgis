#!/usr/bin/env bash
# Apply supabase/migrations to the hosted project (D-09: no local stack).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a
npx -y supabase@latest db push --db-url "$SUPABASE_DB_URL" --yes "$@"
