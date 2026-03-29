#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/cotulenh/app"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/local-supabase-safe.sh status-env
  ./scripts/local-supabase-safe.sh psql [psql args...]
  ./scripts/local-supabase-safe.sh psql-file <sql-file>
  ./scripts/local-supabase-safe.sh app-dev
  ./scripts/local-supabase-safe.sh app-playwright [playwright args...]

Subcommands:
  status-env        Print `supabase status -o env` for the local stack.
  psql              Run `psql` against the local Supabase DB using the discovered DB_URL.
  psql-file         Apply a SQL file to the local Supabase DB with ON_ERROR_STOP=1.
  app-dev           Start the app with local Supabase credentials injected.
  app-playwright    Run app Playwright tests against the local Supabase stack.

Notes:
  - This wrapper is intentionally scoped to local Supabase workflows only.
  - Agents should request a persisted approval for the prefix:
      ["./scripts/local-supabase-safe.sh"]
EOF
}

unquote() {
  local value="$1"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

load_local_supabase_env() {
  local output
  output="$(cd "$ROOT_DIR" && pnpm dlx supabase status -o env)"

  while IFS= read -r line; do
    [[ "$line" == *=* ]] || continue

    local key="${line%%=*}"
    local raw_value="${line#*=}"
    local value
    value="$(unquote "$raw_value")"

    case "$key" in
      API_URL) export LOCAL_SUPABASE_API_URL="$value" ;;
      PUBLISHABLE_KEY) export LOCAL_SUPABASE_PUBLISHABLE_KEY="$value" ;;
      ANON_KEY) export LOCAL_SUPABASE_ANON_KEY="$value" ;;
      SERVICE_ROLE_KEY) export LOCAL_SUPABASE_SERVICE_ROLE_KEY="$value" ;;
      DB_URL) export LOCAL_SUPABASE_DB_URL="$value" ;;
    esac
  done <<<"$output"

  if [[ -z "${LOCAL_SUPABASE_API_URL:-}" || -z "${LOCAL_SUPABASE_PUBLISHABLE_KEY:-}" || -z "${LOCAL_SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "Failed to load local Supabase credentials from \`pnpm dlx supabase status -o env\`." >&2
    exit 1
  fi
}

run_psql() {
  load_local_supabase_env

  if [[ -z "${LOCAL_SUPABASE_DB_URL:-}" ]]; then
    echo "Local Supabase DB_URL is missing." >&2
    exit 1
  fi

  psql "$LOCAL_SUPABASE_DB_URL" "$@"
}

command="${1:-help}"

case "$command" in
  help|-h|--help)
    usage
    ;;
  status-env)
    cd "$ROOT_DIR"
    exec pnpm dlx supabase status -o env
    ;;
  psql)
    shift
    run_psql "$@"
    ;;
  psql-file)
    if [[ $# -lt 2 ]]; then
      echo "Missing SQL file path." >&2
      usage
      exit 1
    fi

    shift
    run_psql -v ON_ERROR_STOP=1 -f "$1"
    ;;
  app-dev)
    load_local_supabase_env
    cd "$APP_DIR"
    exec pnpm dev:local-supabase
    ;;
  app-playwright)
    load_local_supabase_env
    cd "$APP_DIR"
    shift
    exec ./node_modules/.bin/playwright test "$@"
    ;;
  *)
    echo "Unknown subcommand: $command" >&2
    usage
    exit 1
    ;;
esac
