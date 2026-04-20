# Operations

This app is small, but it still needs a repeatable recovery path.

## Backup and Recovery

The app-level backup path is the JSON export in Settings.

- Export regularly from `/settings`
- Keep at least one recent export outside the running machine
- Export before any risky schema or data migration

The export currently includes:

- foods
- weights
- saved meals
- meal logs

It does not try to snapshot auth secrets or Vercel configuration. Those remain infrastructure concerns.

## Restore Drill

At least occasionally, verify that recovery still works:

1. Export from production.
2. Point a disposable environment at a disposable database.
3. Sign in with a throwaway account.
4. Import the JSON from Settings.
5. Verify:
   - foods appear
   - saved meals appear
   - historical meal logs render correctly
   - weight history renders correctly

If that drill fails, treat recovery as broken even if production still looks healthy.

## Deploy Checklist

GitHub now runs a lightweight CI workflow before merge on pull requests:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

That CI is not a full deploy substitute. Keep the broader manual checklist below for releases.

Before deploy:

1. Run `pnpm lint`
2. Run `pnpm typecheck`
3. Run `pnpm test:run`
4. Run `pnpm test:e2e`
5. If schema changed:
   - run `pnpm db:generate`
   - review the SQL migration
   - run `pnpm db:migrate`

After deploy:

1. Load the login page.
2. Sign in with a real account.
3. Verify the main pages load: Today, Weight, Foods, Meals, Stats, Settings.
4. Check Vercel logs for unexpected auth or database errors.

## Monitoring

There is no separate monitoring vendor configured in this repo today. The lightweight operating posture is:

- use Vercel runtime logs as the first-line signal
- verify the app manually after deploys
- keep export/import healthy as the recovery fallback

If incidents become more frequent, the next step should be lightweight alerting around repeated auth failures or server errors, not a broad observability overhaul.

## Incidents

If the app is up but behaving incorrectly:

1. Reproduce the issue once.
2. Pull Vercel logs for the exact request window.
3. Decide whether the issue is:
   - auth/session
   - application logic
   - database schema/data
4. If data integrity is at risk, stop making manual edits until you have a current export.
