# Supabase Migration Ordering Note (0180 / 0185)

`supabase db push --linked --include-all` can fail when migration history contains version `018`
while the repo migration set contains `0185_*` and `018_*` because file ordering can drift.

To stabilize ordering, migration `018_game_states_disconnect_tracking.sql` was renamed to:

- `supabase/migrations/0180_game_states_disconnect_tracking.sql`

This enforces a clear lexical order:

- `0180` -> `0185` -> `019`

## One-time Repair For Existing Hosted Environments

For environments that already recorded version `018`, run:

```bash
pnpm dlx supabase link --project-ref <PROJECT_REF>
pnpm dlx supabase migration repair --linked --status reverted 018 --yes
pnpm dlx supabase migration repair --linked --status applied 0180 --yes
pnpm dlx supabase migration list --linked
```

Expected migration list segment after repair:

- `0180` present
- `0185` present
- `018` absent

After that, `pnpm dlx supabase db push --linked --include-all` should no longer fail from this ordering conflict.
