@AGENTS.md

# 4urhealth — Project Guide

A single-user personal nutrition and weight-loss tracker. Not a product, not multi-tenant — just Tony's own app. Keep scope small.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a deep dive on why each piece exists and how it fits together. This file is the short operator's manual.

## What this app is

- **Who uses it:** one person (the owner). Auth exists only to keep the public internet out, not to support multiple users.
- **What it tracks:** weight over time; meals (Breakfast, Lunch, Dinner, Snacks) with calories + macros; reusable food items; saved meals; weekly/monthly adherence stats.
- **Where it runs:** Vercel (Next.js app) + Neon Postgres, installable as a PWA on iPhone.
- **Units:** imperial (lbs, ft/in).

## Tech stack (authoritative — if it conflicts with your memory, trust this)

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.x App Router + React 19.2 + Server Actions |
| Build | **Webpack** (`next build --webpack`) — Serwist is webpack-only |
| Lang | TypeScript strict |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`, `@theme inline` in `globals.css`) |
| ORM | Drizzle ORM 0.45.x |
| DB driver | **`drizzle-orm/neon-serverless`** with `Pool` + `ws` polyfill — NOT `neon-http` (no transaction support) |
| DB | Neon Postgres (pooled URL for runtime, unpooled for migrations) |
| Auth | Better Auth 1.6.x (email + password, argon2id) with `drizzleAdapter` |
| Validation | Zod 4.x |
| Charts | Recharts 3.x |
| PWA | `@serwist/next` 9.x |
| Lint/format | Biome 2.4.x (tabs, double quotes) |
| Tests | Vitest (unit) + Playwright (e2e, scaffolded) |
| Package manager | pnpm |

## Commands

```bash
pnpm dev                 # next dev (Turbopack) on :3000
pnpm build               # next build --webpack  (REQUIRED — Serwist breaks on Turbopack)
pnpm typecheck           # tsc --noEmit
pnpm lint                # biome check .
pnpm lint:fix            # biome check --write .
pnpm test:run            # vitest run (CI-safe, no watch)
pnpm db:generate         # drizzle-kit generate (after schema change)
pnpm db:migrate          # apply migrations (uses DATABASE_URL_UNPOOLED)
pnpm db:studio           # browse DB locally
```

## Non-obvious rules — read before editing

1. **Next.js 16 is not the Next.js in your training data.** APIs have changed. Before using anything unfamiliar, read `node_modules/next/dist/docs/`. Notable departures:
   - `middleware.ts` is gone — we use `proxy.ts` at the project root.
   - Route `PageProps` types are generated; import from `next` rather than hand-rolling.
   - Default dev/build is Turbopack; we pin `build` to `--webpack` because of Serwist.

2. **Drizzle + Neon: use the serverless driver, not the HTTP driver.** `drizzle-orm/neon-http` throws `"No transactions support in neon-http driver"` at runtime on any `db.transaction(...)`. We depend on transactions in onboarding, saved-meal create/update/apply, add-meal-item, and import. See `db/index.ts` — it uses `Pool` from `@neondatabase/serverless` with a `ws` polyfill.

3. **Every user-scoped query MUST filter by `userId`.** There is no DB-level row isolation — it's enforced in application code. Get the user id via `requireUserId()` from `lib/auth-server.ts`, and pass it into every `where()`. Treat this like `SELECT ... WHERE user_id = $1` is a required clause.

4. **`meal_log_item` snapshots nutrition columns.** When you insert a logged meal item, copy `name/calories/protein/fat/carbs` into the `*_snapshot` columns. Reads display the snapshot. The `food_item_id` link exists only for editing convenience. Do not "recompute" historical totals from the live `food_item` row — that would corrupt history when foods are edited.

5. **Biome formatter: tabs, double quotes.** If a file looks fine but lint fails, run `pnpm lint:fix`. Biome ignores `.claude`, `.next`, and generated SW files (see `biome.json`).

6. **No CSP header** — we set HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`, but no Content-Security-Policy because it was too noisy with inline scripts. Revisit if we start handling richer user content.

7. **Serwist disables itself in development** (`disable: process.env.NODE_ENV === "development"` in `next.config.ts`). You only see service-worker behaviour in a production build.

## File layout (what lives where)

```
app/
  (auth)/login, (auth)/signup   -- unauth'd screens
  (app)/                         -- authenticated app layout
    page.tsx                     -- Today
    day/[date]/page.tsx
    foods, meals, weight, stats, settings
    actions.ts                   -- signOutAction (session-related)
    layout.tsx                   -- redirects to /onboarding if !onboardedAt
  onboarding/                    -- standalone: outside (app) so the onboarding gate doesn't block it
  api/auth/[...all]/route.ts     -- Better Auth catch-all handler
  layout.tsx                     -- root <html>, font, SW registration
  manifest.ts, icon.tsx, apple-icon.tsx, sw.ts
  error.tsx, not-found.tsx       -- error boundaries

components/                      -- React components (mix of server + client)
lib/
  auth.ts                        -- Better Auth config (server-only via usage)
  auth-server.ts                 -- getSession, requireSession, requireUserId
  auth-client.ts                 -- client-side authClient
  tdee.ts, date.ts               -- pure functions (unit-tested)

db/
  index.ts                       -- db client (neon-serverless Pool + ws)
  schema.ts                      -- re-exports app-schema + auth-schema
  app-schema.ts, auth-schema.ts
  migrations/                    -- drizzle-kit output

proxy.ts                         -- session cookie gate (replaces middleware.ts)
next.config.ts                   -- Serwist wrap + security headers
drizzle.config.ts                -- uses DATABASE_URL_UNPOOLED
biome.json
```

## Adding a feature — the recipe we follow

1. **Schema first.** Edit `db/app-schema.ts` (or `auth-schema.ts` for Better Auth additions). Run `pnpm db:generate` → review generated SQL in `db/migrations/` → `pnpm db:migrate`.
2. **Server action.** Write the `"use server"` action alongside the page it belongs to (e.g. `app/(app)/foods/actions.ts`). Always: `requireUserId()`, parse input with a Zod schema, filter all queries by `userId`, return typed results. Use `revalidatePath` or `revalidateTag` to refresh server components.
3. **Page.** Server component by default (`async` function, runs on the server, reads DB directly). Only use `"use client"` for things that need hooks, events, or browser APIs.
4. **Client island.** If the page needs interactivity, split a `"use client"` component that accepts data as props from the server component.
5. **Test the math.** Pure utilities (`tdee.ts`, `date.ts`) get Vitest unit tests. Avoid testing server actions directly — cover them via Playwright e2e where practical.
6. **Lint & typecheck before commit:** `pnpm typecheck && pnpm lint && pnpm test:run`.

## Deploy

Pushes to `main` on GitHub auto-deploy to Vercel (project is connected). Preview deploys for other branches. Neon is attached via the Vercel Postgres integration — `DATABASE_URL` and `DATABASE_URL_UNPOOLED` come from there.

Set these Vercel env vars for production:
- `DATABASE_URL` (pooled) — used by runtime
- `DATABASE_URL_UNPOOLED` — used by `drizzle-kit migrate`
- `BETTER_AUTH_SECRET` — required
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — the canonical app URL

## Known footguns we've hit

- **"Server Components render" error in production with no details.** Almost always a server-action throw. Check Vercel runtime logs. Past cause: neon-http driver doesn't support transactions.
- **Turbopack build fails with Serwist.** Always build with `--webpack`.
- **Biome `noLabelWithoutControl` can't see `<input>` nested inside `<label>`.** If we genuinely need a nested input, use a `<div>` wrapper and `aria-label`/`aria-labelledby` instead.
- **Cookie-cache lag on Better Auth.** We disabled `cookieCache` because fresh `onboardedAt` writes need to be visible on the very next request.
