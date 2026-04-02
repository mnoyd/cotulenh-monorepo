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
  ./scripts/local-supabase-safe.sh seed-tournament-scheduler-secrets
  ./scripts/local-supabase-safe.sh repair-profiles-schema
  ./scripts/local-supabase-safe.sh app-dev
  ./scripts/local-supabase-safe.sh app-playwright [playwright args...]

Subcommands:
  status-env        Print `supabase status -o env` for the local stack.
  psql              Run `psql` against the local Supabase DB using the discovered DB_URL.
  psql-file         Apply a SQL file to the local Supabase DB with ON_ERROR_STOP=1.
  seed-tournament-scheduler-secrets
                    Upsert Vault secrets (`project_url`, `service_role_key`) from local
                    Supabase env so migration 028 scheduler jobs can invoke tournament-pair.
  repair-profiles-schema
                    Repair local `public.profiles` schema drift from migrations 018/024 and
                    print verification output for username/rating/trigger state.
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

repair_profiles_schema() {
  local repair_sql="$ROOT_DIR/scripts/fix_local_profiles_schema.sql"

  if [[ ! -f "$repair_sql" ]]; then
    echo "Repair SQL file not found: $repair_sql" >&2
    exit 1
  fi

  run_psql -v ON_ERROR_STOP=1 -f "$repair_sql"

  run_psql -Atqc "
    select 'columns';
    select column_name || '|' || is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in ('rating', 'username')
    order by column_name;
    select 'migration_versions';
    select version
    from supabase_migrations.schema_migrations
    where version in ('018', '024')
    order by version;
    select 'username_duplicates';
    select count(*)
    from (
      select username
      from public.profiles
      group by username
      having count(*) > 1
    ) duplicates;
    select 'trigger_function';
    select pg_get_functiondef('public.handle_new_user()'::regprocedure) like '%username%';
    select 'username_index';
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'idx_profiles_username';
  "
}

seed_tournament_scheduler_secrets() {
  load_local_supabase_env

  run_psql -q -v ON_ERROR_STOP=1 \
    -v project_url="$LOCAL_SUPABASE_API_URL" \
    -v service_role_key="$LOCAL_SUPABASE_SERVICE_ROLE_KEY" >/dev/null <<'SQL'
SELECT vault.update_secret(
  d.id,
  :'project_url',
  'project_url',
  'Supabase project URL for tournament scheduler jobs'
)
FROM vault.decrypted_secrets d
WHERE d.name = 'project_url';

SELECT vault.create_secret(
  :'project_url',
  'project_url',
  'Supabase project URL for tournament scheduler jobs'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM vault.decrypted_secrets d
  WHERE d.name = 'project_url'
);

SELECT vault.update_secret(
  d.id,
  :'service_role_key',
  'service_role_key',
  'Supabase service role key for tournament scheduler jobs'
)
FROM vault.decrypted_secrets d
WHERE d.name = 'service_role_key';

SELECT vault.create_secret(
  :'service_role_key',
  'service_role_key',
  'Supabase service role key for tournament scheduler jobs'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM vault.decrypted_secrets d
  WHERE d.name = 'service_role_key'
);
SQL

  run_psql -F $'\t' -Atqc "
    select 'secrets';
    select name,
           case
             when decrypted_secret is null or length(decrypted_secret) = 0 then 'missing'
             else 'configured'
           end as status
    from vault.decrypted_secrets
    where name in ('project_url', 'service_role_key')
    order by name;
    select 'scheduler_functions';
    with required(name) as (
      values
        ('invoke_tournament_pair_edge'),
        ('schedule_due_tournaments'),
        ('schedule_expired_tournaments')
    )
    select r.name,
           case when p.proname is null then 'missing' else 'present' end as status
    from required r
    left join pg_proc p on p.proname = r.name
    left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where n.nspname = 'public' or n.nspname is null
    order by r.name;
  "
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
  seed-tournament-scheduler-secrets)
    seed_tournament_scheduler_secrets
    ;;
  repair-profiles-schema)
    repair_profiles_schema
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
