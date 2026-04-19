# Database Migration Workflow

This app is set up for **schema versioning with Drizzle migrations**. That is the correct path for production changes.

Do **not** use `pnpm db:push` for production. It now refuses by default. Direct schema push is only acceptable for disposable databases.

## Safe Default Workflow

Use this flow any time you add or change tables/columns:

1. Edit the schema in [/Users/tonyc/src/4urhealth/db/app-schema.ts](/Users/tonyc/src/4urhealth/db/app-schema.ts:1) or [/Users/tonyc/src/4urhealth/db/auth-schema.ts](/Users/tonyc/src/4urhealth/db/auth-schema.ts:1).
2. Generate a migration:

```bash
pnpm db:generate
```

3. Review the generated SQL in [/Users/tonyc/src/4urhealth/db/migrations](/Users/tonyc/src/4urhealth/db/migrations).
4. Apply it to the target database:

```bash
pnpm db:migrate
```

5. Run app verification before deploy:

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

6. Deploy only after the migration SQL looks correct.

## What Is Usually Safe

These are normally low-risk and non-destructive:

- creating a new table
- adding a nullable column
- adding a column with a safe default
- adding an index

## What Needs Extra Care

These can break existing users or corrupt assumptions if done casually:

- dropping a column or table
- renaming a column that running code still expects
- changing a column type
- making a nullable column required
- changing foreign-key behavior
- backfilling data in the same step as a constraint hardening

For these, use a **two-phase migration**:

1. Add the new structure in a backward-compatible way.
2. Deploy code that reads/writes both old and new shapes if needed.
3. Backfill data.
4. Add stricter constraints or remove the old structure in a later migration.

## Production Checklist

Before applying a migration to production:

1. Read the SQL, not just the schema diff.
2. Confirm it does not contain unexpected `DROP`, destructive `ALTER`, or table rewrites.
3. For risky changes, create a Neon branch or backup path first.
4. Apply the migration before or alongside the deploy, depending on compatibility.
5. Verify critical user data after deploy:
   - foods
   - saved meals
   - meal logs
   - weight logs
   - onboarding/auth data

## Commands

- `pnpm db:generate`
  Creates a versioned SQL migration from schema changes.

- `pnpm db:migrate`
  Applies versioned migrations using `DATABASE_URL_UNPOOLED`.

- `pnpm db:push`
  Intentionally blocked to prevent unsafe direct schema sync.

- `pnpm db:push:unsafe`
  Direct schema push for disposable databases only.
