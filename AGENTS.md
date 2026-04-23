# 4urhealth Agent Guide

## Core Rule

This repo uses a modern Next.js release with breaking changes from older versions. Before changing framework-specific behavior, read the relevant guide under `node_modules/next/dist/docs/` and follow current conventions.

## Source Of Truth

- Read this file first before making substantial changes.
- Use [ARCHITECTURE.md](/Users/tonyc/src/4urhealth/ARCHITECTURE.md:1) for deeper rationale and request/data-flow details.
- Use [OPERATIONS.md](/Users/tonyc/src/4urhealth/OPERATIONS.md:1) for backup, restore, deploy, and monitoring guidance.
- If these docs conflict with memory, trust the repo docs.

## Stack Constraints

- Framework: Next.js 16 App Router, React 19, Server Actions
- Build: `next build --webpack`
- PWA: Serwist-based installable app; be careful around manifest/service worker changes
- Database: Neon Postgres
- ORM: Drizzle ORM
- Auth: Better Auth
- Package manager: `pnpm`
- Formatter/linter: Biome with tabs and double quotes

## Shared Helpers

- Prefer existing shared helpers before introducing new local duplicates:
- `lib/app-page.ts` for common authenticated page context (`session`, `userId`, `today`)
- `lib/meal-log.ts` for meal-log upsert, meal snapshot helpers, and day revalidation
- `lib/form.ts` for shared required-number parsing
- `lib/app-types.ts` for shared meal/food view types
- The repo currently uses standard-library date helpers in `lib/date.ts`; `date-fns` and `react-hook-form` are not part of the active app surface

## Project Rules

1. Use `proxy.ts` rather than `middleware.ts`.
2. Keep all user-scoped queries filtered by `userId`.
3. Preserve meal snapshot columns on `meal_log_item`; do not recompute historical nutrition from live foods.
4. Prefer server components by default and only use client components for browser-only interactivity.
5. Validate server-action input with Zod at the boundary.
6. Run `pnpm lint` and `pnpm typecheck` after meaningful code changes. `pnpm typecheck` already runs `next typegen` first; do not replace it with plain `tsc`.
7. Run `pnpm test:run` when logic, routes, or server actions change.
8. Run `pnpm test:e2e` when changes touch auth, onboarding, settings/theme persistence, navigation/layout, or meal logging flows.
9. Prefer small branch-based changes and PRs against `main`; this repo now relies on GitHub Actions `verify` as the merge gate.

## Security Notes

- This is a private app now. Public self-service signup is disabled in normal development and production.
- `/signup` should remain available only inside the Playwright harness (`PLAYWRIGHT=1`).
- Keep Better Auth origin restrictions tight. Only allow the configured canonical app hosts; do not reintroduce broad wildcards like `*.vercel.app`.
- Do not trust `next` redirect params blindly. Keep redirects constrained to safe same-origin app paths.
- Preserve auth throttling/rate limiting unless you are deliberately changing the threat posture.
- Keep CSP and other response hardening intact when changing `next.config.ts` or theme bootstrapping.

## Database Notes

- Runtime uses the pooled `DATABASE_URL`.
- Migrations use `DATABASE_URL_UNPOOLED`.
- Be careful with Neon driver choices and transaction support. The app depends on transactions in onboarding and meal flows.
- Never use `pnpm db:push` for production changes. Generate reviewed SQL migrations with `pnpm db:generate`, then apply them with `pnpm db:migrate`.
- For risky schema changes, prefer a two-phase migration and preserve backward compatibility during rollout.

## Deployment Notes

- Production runs on Vercel.
- `main` deploys to Vercel production. Non-`main` branches get preview deployments.
- GitHub Actions runs the `verify` job on PRs and pushes to `main`.
- `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL` should be set in deployed environments.
- `BETTER_AUTH_SECRET` must exist in every deployed environment that needs auth.
- When debugging production failures, check Vercel runtime logs first; Next.js redacts many server errors in production responses.
- After merging a fix, verify the deployment state in Vercel before assuming production has the change.

## Test Harness Notes

- The Playwright suite starts its own local Next dev server with `PLAYWRIGHT=1`.
- That flag enables a local-only signup harness for e2e coverage; public signup remains disabled in normal development and production.
- The heavier authenticated CRUD flow is covered on desktop Chromium. The iPhone project still verifies route protection and mobile layout behavior, but not the full create-account flow.
- Current automated coverage includes unit/regression tests, server-action tests, proxy/export route coverage, and core e2e flows. Keep new regressions covered when you fix them.

## UI Notes

- The app now supports persisted light/dark theme preference via user profile plus a theme cookie for SSR.
- Tailwind dark styling is class-driven via `html.dark`, not just `prefers-color-scheme`.
- Mobile layout matters: verify nav and primary flows in a narrow viewport when changing shared UI or top-level navigation.
