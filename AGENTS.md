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
- Database: Neon Postgres
- ORM: Drizzle ORM
- Auth: Better Auth
- Package manager: `pnpm`
- Formatter/linter: Biome with tabs and double quotes

## Project Rules

1. Use `proxy.ts` rather than `middleware.ts`.
2. Keep all user-scoped queries filtered by `userId`.
3. Preserve meal snapshot columns on `meal_log_item`; do not recompute historical nutrition from live foods.
4. Prefer server components by default and only use client components for browser-only interactivity.
5. Validate server-action input with Zod at the boundary.
6. Run `pnpm typecheck` and `pnpm lint` after meaningful code changes.
7. Run `pnpm test:e2e` when changes touch auth, onboarding, settings/theme persistence, or meal logging flows.

## Database Notes

- Runtime uses the pooled `DATABASE_URL`.
- Migrations use `DATABASE_URL_UNPOOLED`.
- Be careful with Neon driver choices and transaction support. The app depends on transactions in onboarding and meal flows.
- Never use `pnpm db:push` for production changes. Generate reviewed SQL migrations with `pnpm db:generate`, then apply them with `pnpm db:migrate`.
- For risky schema changes, prefer a two-phase migration and preserve backward compatibility during rollout.

## Deployment Notes

- Production runs on Vercel.
- `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL` should be set in deployed environments.
- When debugging production failures, check Vercel runtime logs first; Next.js redacts many server errors in production responses.

## Test Harness Notes

- The Playwright suite starts its own local Next dev server with `PLAYWRIGHT=1`.
- That flag enables a local-only signup harness for e2e coverage; public signup remains disabled in normal development and production.
- The heavier authenticated CRUD flow is covered on desktop Chromium. The iPhone project still verifies route protection and mobile layout behavior, but not the full create-account flow.
