# 4urhealth

Personal nutrition and weight tracker built with Next.js, Better Auth, Drizzle, and Neon Postgres.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local env file before running the app. This repo expects:

- `DATABASE_URL` for runtime queries
- `DATABASE_URL_UNPOOLED` for Drizzle migrations
- `BETTER_AUTH_SECRET` for Better Auth
- `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL` for the canonical app URL

If this repo is linked to Vercel, the easiest path is to pull env vars into `.env.local` with the Vercel CLI.

Then run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Core Commands

```bash
pnpm dev
pnpm start
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

## Database Workflow

Use versioned Drizzle migrations for schema changes. Do not use direct schema push against production.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

The production-safe migration process is documented in [DB_MIGRATIONS.md](/Users/tonyc/src/4urhealth/DB_MIGRATIONS.md:1).

`pnpm db:push` is intentionally blocked as a guardrail. If you are working against a disposable database and truly want a direct sync, use:

```bash
pnpm db:push:unsafe
```

## Docs

- [AGENTS.md](/Users/tonyc/src/4urhealth/AGENTS.md:1) for project conventions and working rules
- [ARCHITECTURE.md](/Users/tonyc/src/4urhealth/ARCHITECTURE.md:1) for system design and data flow
- [DB_MIGRATIONS.md](/Users/tonyc/src/4urhealth/DB_MIGRATIONS.md:1) for the production migration workflow

## Deployment

Pushes to `main` deploy to Vercel production. Preview deployments are created for non-`main` branches.

The production build uses:

```bash
pnpm build
```

which maps to `next build --webpack` in this repo. Do not swap that to Turbopack without verifying the PWA build path first.

For database changes in production:

1. generate the migration
2. review the SQL
3. apply it with `pnpm db:migrate`
4. then deploy the app
