# Tournament Scheduler Vault Secrets

Migration `028_tournament_scheduler.sql` invokes `tournament-pair` over HTTP from Postgres (`pg_net`).
It expects two Vault secret names:

- `project_url` (or fallback: `supabase_project_url`)
- `service_role_key` (or fallback: `supabase_service_role_key`)

Without these secrets, scheduler jobs skip execution.

## Local Supabase

Use the wrapper command (idempotent):

```bash
./scripts/local-supabase-safe.sh seed-tournament-scheduler-secrets
```

This command:

1. Reads local `API_URL` and `SERVICE_ROLE_KEY` from `supabase status -o env`
2. Upserts `vault` secrets `project_url` and `service_role_key`
3. Prints verification output for secret presence and scheduler RPCs

## Hosted Environments (staging/prod)

Run in SQL Editor (or psql with privileged role), replacing placeholders:

```sql
DO $$
DECLARE
  v_project_url_secret_id uuid;
  v_service_role_secret_id uuid;
BEGIN
  SELECT id INTO v_project_url_secret_id
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  IF v_project_url_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      '<https://YOUR-PROJECT.supabase.co>',
      'project_url',
      'Supabase project URL for tournament scheduler jobs'
    );
  ELSE
    PERFORM vault.update_secret(
      v_project_url_secret_id,
      '<https://YOUR-PROJECT.supabase.co>',
      'project_url',
      'Supabase project URL for tournament scheduler jobs'
    );
  END IF;

  SELECT id INTO v_service_role_secret_id
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_role_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      '<YOUR_SERVICE_ROLE_KEY>',
      'service_role_key',
      'Supabase service role key for tournament scheduler jobs'
    );
  ELSE
    PERFORM vault.update_secret(
      v_service_role_secret_id,
      '<YOUR_SERVICE_ROLE_KEY>',
      'service_role_key',
      'Supabase service role key for tournament scheduler jobs'
    );
  END IF;
END
$$;
```

Verify:

```sql
SELECT name
FROM vault.decrypted_secrets
WHERE name IN ('project_url', 'service_role_key')
ORDER BY name;
```
