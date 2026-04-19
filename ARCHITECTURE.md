# 4urhealth — Architecture & Stack Guide

This document is written for someone who can read code and understand backends but hasn't lived in the modern frontend / Vercel ecosystem. It explains **why** we picked each dependency, **what each one does**, and **how they fit together** from the browser down to Postgres.

If you only read one section, read ["The mental model"](#the-mental-model) below and ["Request lifecycle"](#request-lifecycle-end-to-end) further down.

---

## Table of contents

1. [Goals that drove the design](#goals-that-drove-the-design)
2. [The mental model](#the-mental-model)
3. [The stack, layer by layer](#the-stack-layer-by-layer)
    - [Hosting: Vercel](#hosting-vercel)
    - [Database: Neon Postgres](#database-neon-postgres)
    - [Framework: Next.js 16 App Router](#framework-nextjs-16-app-router)
    - [Runtime UI: React 19](#runtime-ui-react-19)
    - [Styling: Tailwind CSS v4](#styling-tailwind-css-v4)
    - [Auth: Better Auth](#auth-better-auth)
    - [ORM: Drizzle](#orm-drizzle)
    - [Validation: Zod](#validation-zod)
    - [Forms: react-hook-form](#forms-react-hook-form)
    - [Charts: Recharts](#charts-recharts)
    - [Dates: date-fns and Intl](#dates-date-fns-and-intl)
    - [PWA: Serwist](#pwa-serwist)
    - [Tooling: Biome, TypeScript, Vitest, Playwright](#tooling-biome-typescript-vitest-playwright)
4. [Data model](#data-model)
5. [Security model](#security-model)
6. [Request lifecycle end-to-end](#request-lifecycle-end-to-end)
7. [Deployment pipeline](#deployment-pipeline)
8. [Gotchas we've hit and why they exist](#gotchas-weve-hit-and-why-they-exist)

---

## Goals that drove the design

- **Single user.** Only Tony logs in. The auth system exists to keep the internet out, not to scale to millions.
- **Low maintenance.** No container to babysit, no infra to tune — push to GitHub, Vercel deploys, done.
- **Mobile-first PWA.** Works in a browser tab on desktop, installs as a home-screen app on iPhone with `standalone` display.
- **Feature-lean.** Just weight + meals + stats + export. Explicitly simpler than MyFitnessPal.
- **Historical integrity.** If you rename "Scrambled eggs" or fix its calories, past days must stay accurate.

These goals drive a lot of what looks like over-choice when you read the stack: we use serverless-friendly tools (Neon, Drizzle neon-serverless driver), server-first rendering (RSC + server actions) to keep client JS small, and a snapshot pattern in the DB for historical integrity.

---

## The mental model

Before the deep dive, here's the one-page summary of how a page renders:

1. The user's browser makes a request to `https://yourapp.vercel.app/...`.
2. Vercel's edge routes the request into a **Next.js serverless function** (a Node.js runtime on AWS Lambda, managed by Vercel).
3. `proxy.ts` runs first. It checks for a session cookie; unauthenticated requests to protected paths get a 302 to `/login`.
4. Next.js finds the matching file under `app/`. If it's a server component (default), Next runs it **on the server**, awaiting database queries inline, and produces HTML + a compact "RSC payload" describing the React tree.
5. That HTML streams back to the browser. For any client components inside the tree (`"use client"`), the browser downloads their JS and "hydrates" them — attaching event handlers so buttons work.
6. When the user clicks a form's submit button, it invokes a **server action** (`"use server"`). That's an RPC to the same Vercel function that opens a transaction on Neon Postgres, mutates data, and triggers `revalidatePath` so the next render is fresh.

Key idea: **most of the code runs on the server, not in the browser.** React components are a rendering language; the database calls are inline in those components. You don't write `fetch()` to your own API — the "API" is the server component itself.

---

## The stack, layer by layer

### Hosting: Vercel

**What it is:** a managed serverless platform, built by the company that makes Next.js. It treats a Git repo as the unit of deployment.

**What it does for us:**
- Listens on our domain, terminates TLS, serves HTTP/2.
- Runs a **CDN** (edge cache) for static assets and SSR-cacheable routes.
- For each request to a dynamic route, spins up or reuses a **serverless function** — a Node.js process that imports `.next/server/...` bundles and handles one request at a time.
- Watches GitHub: every push to `main` triggers a production build; other branches get preview URLs.
- Provides secrets management (env vars) and observability (runtime logs, request traces).

**Why we chose it:** Next.js is first-party here. Deploy is literally `git push`. Free tier covers a one-user app.

**Trade-offs:**
- Serverless cold starts exist, but are ~100ms on warm code paths for Node 22.
- You cannot hold long-lived connections (websockets between requests). This constrains how we talk to Postgres — see "Neon" below.
- Vercel-managed, so portability requires migrating to something like AWS Amplify / Cloudflare Pages / a VPS.

**Key files:**
- `.vercel/` — generated, do not edit
- `next.config.ts` — framework config; Vercel reads it during build

### Database: Neon Postgres

**What it is:** a serverless Postgres service. Ordinary Postgres dialect, but with two twists: (1) **it separates compute from storage** so idle instances scale to zero and new ones spin up in ~300ms; (2) it exposes connections over both HTTP and **WebSocket** in addition to the standard `pg` wire protocol.

**Why serverless Postgres matters for us:** traditional Postgres connections are stateful TCP sockets — each concurrent request needs its own connection, and Postgres falls over around a few hundred. Vercel functions can spin up dozens of instances; a naïve setup exhausts the connection limit. Neon solves this by exposing:
- A **pooled** endpoint (`DATABASE_URL`) that goes through PgBouncer in transaction-pooling mode. You get a cheap "connection" that's really a lease on a shared backend. Perfect for per-request queries.
- An **unpooled** endpoint (`DATABASE_URL_UNPOOLED`) that is a direct connection. Required for things that need persistent state like migrations or `LISTEN/NOTIFY`.

**How we talk to it:** via the `@neondatabase/serverless` package using its `Pool` class. This opens connections over **WebSockets**, which Vercel functions tolerate better than keeping raw TCP sockets warm. Because Node.js doesn't have a built-in WebSocket client, we feed Neon a constructor from the `ws` npm package:

```ts
// db/index.ts
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

**Why not the `neon-http` driver?** Neon ships an even thinner HTTP-only driver that skips the WebSocket. It's tempting for speed, but it **does not support transactions** — and we rely on transactions in onboarding, saved-meal create/apply, meal-item add, and import. When the HTTP driver hits `db.transaction(...)`, it throws at runtime, which cost us a debugging session.

### Framework: Next.js 16 App Router

Next.js is where most of the magic — and the learning curve — lives. Think of it as four things bundled:

1. **A file-based router.** The folder structure under `app/` is the URL structure. `app/(app)/foods/page.tsx` renders at `/foods`. Special filenames have special roles:
    - `page.tsx` — the route's UI
    - `layout.tsx` — wraps a route and all its children (stays mounted across navigations)
    - `loading.tsx` — shown while a server component is streaming
    - `error.tsx` — client error boundary for the route subtree
    - `not-found.tsx` — 404 UI
    - `route.ts` — an HTTP handler (classic REST endpoint)

2. **React Server Components (RSC).** By default, every component under `app/` runs **on the server**. That means you can `import { db } from "@/db"` at the top of `page.tsx` and `await` a Drizzle query right in the function body — no API layer between the UI and the database. The output is not HTML alone; it's a streamable "RSC payload" that the client React runtime reconstructs into a DOM tree. The component's source **never ships to the browser**.
    - To opt a file into running in the browser (so you can use `useState`, `onClick`, etc.), add `"use client"` at the very top. That file and everything it imports becomes a client bundle.
    - Pattern we use: server component fetches data → renders a small client component and passes the data in as props. See `app/(app)/page.tsx` → `DayView` for an example.

3. **Server Actions.** A function marked `"use server"` can be passed as the `action` prop of a `<form>`, or imported and called from a client component. Next.js rewires that into an RPC: it assigns the function a hidden ID, sends a POST to the same Vercel function, runs the function on the server with the form data as input, and revalidates the page. This replaces 90% of what you'd otherwise build a REST or tRPC layer for.

4. **Build pipeline.** `next build` bundles everything: server components go into a Node-targeted bundle, client components into browser bundles, CSS gets extracted, static assets get content-hashed. We force `--webpack` because Serwist (service worker) doesn't support Turbopack yet.

**Route groups:** folders like `(app)` and `(auth)` with parentheses **don't appear in the URL**. They're purely organisational — a way to share a layout across a set of routes without affecting the URL structure. `(app)/layout.tsx` is our auth gate: if there's no session, redirect to login; if the user hasn't finished onboarding, redirect to `/onboarding`.

**`proxy.ts`:** historically called `middleware.ts` in older Next.js; renamed in v16. This file runs in a lightweight edge runtime **before** your server function picks up the request. We use it to cheaply redirect unauthenticated traffic away from protected paths and authenticated traffic away from `/login`. It does not make a DB call — just checks for the session cookie's existence.

**Why Next.js specifically:**
- Tight coupling to Vercel means deploys are ~60s from push to live.
- RSC + server actions eliminate the "build an API" step that React SPAs require.
- TypeScript support is first-class (route param types are generated).
- Large ecosystem — if it ships in the React world, it works here.

**Notable departures from older tutorials:**
- `getServerSideProps` / `getStaticProps` are dead. Data loading happens inside the component (`async` function body).
- Pages router (`pages/`) still works but we use App Router exclusively.
- `next-pwa` is abandoned; we use Serwist instead.

### Runtime UI: React 19

We're on React 19.2. Key differences from older React you might know from reading code:
- **`async` components are real.** `async function Page() { const rows = await db.select()...; return <ul>...</ul> }` is legal in server components.
- **`use()` hook** unwraps a promise or context in either server or client components.
- **`useFormStatus` / `useFormState`** give you pending/success state for forms submitted to server actions, without needing to track it manually.
- **Automatic batching** across async boundaries.

You don't need to know all of this — most of our UI is straightforward. We mostly lean on: `useState`, `useEffect`, `useActionState` (for forms posting to server actions), and `useTransition` (to show pending UI while a server action runs).

### Styling: Tailwind CSS v4

**What it is:** a utility-first CSS framework. Instead of writing a `.card` class in a stylesheet and then a separate component using `className="card"`, you write `className="rounded-md border bg-white p-4 shadow"` directly on the element. The build step scans your source for these class strings and generates only the CSS you actually used.

**Why it's useful here:**
- No separate CSS files to maintain.
- Refactor-safe: delete the JSX, the CSS dies with it automatically.
- Consistent spacing/colour scale baked in (`p-4` is always the same padding).
- Mobile-first responsive by default (`md:hidden` hides on desktop).

**v4 specifics:**
- v4 dropped `tailwind.config.js` in favour of CSS-native config inside `app/globals.css` using `@theme inline { ... }`.
- Integrates with PostCSS via `@tailwindcss/postcss`.

**Why we didn't use a component library (shadcn/ui, Material, etc.):** the UI is simple and we wanted to keep bundles small. A dozen raw Tailwind-styled elements beat pulling in Radix for this scale.

### Auth: Better Auth

**What it is:** a TypeScript-first auth library. It handles the undifferentiated parts of auth — password hashing (argon2id), session cookies, CSRF protection on its own routes, rate limiting on login/signup, account schema.

**Why this instead of NextAuth/Auth.js:** the Auth.js team merged into Better Auth in late 2025; it's the actively-maintained path forward in the Next.js world.

**How it's wired:**

1. **Schema.** Better Auth needs four tables: `user`, `session`, `account`, `verification`. We declare them in Drizzle at `db/auth-schema.ts` and add our app-specific profile columns (sex, dob, heightIn, targets…) as `additionalFields` on the user table. Because we own the Drizzle schema, Better Auth doesn't manage migrations — we do.

2. **The config** (`lib/auth.ts`) is a single `betterAuth({...})` call that takes the DB adapter (`drizzleAdapter(db, { provider: "pg" })`), enables email+password with `minPasswordLength: 10`, and registers the `additionalFields` so Better Auth includes them when it reads/writes the user row.

3. **The HTTP surface** is a single catch-all route at `app/api/auth/[...all]/route.ts` that forwards all of `/api/auth/*` to Better Auth's handler. It owns `/api/auth/sign-in/email`, `/api/auth/sign-out`, etc.

4. **Session reads in server code** go through `lib/auth-server.ts`, which wraps `auth.api.getSession({ headers })` in React's `cache()` so multiple `requireSession()` calls in the same request hit only one DB query.

5. **Cookie cache is disabled.** Better Auth can cache session lookups in a signed cookie for 5 minutes. We turned this off because when onboarding writes `onboardedAt` to the user row, the `(app)/layout.tsx` redirect needs to see the new value on the very next request — a 5-minute lag would loop the user back to onboarding after they finish it.

### ORM: Drizzle

**What it is:** a TypeScript-first, SQL-shaped ORM. Unlike Prisma (which has its own schema language and a generated client), Drizzle lets you declare tables as TS literals and then composes queries in a fluent SQL-like builder:

```ts
await db.select({ id: foodItem.id, name: foodItem.name })
    .from(foodItem)
    .where(and(eq(foodItem.userId, userId), isNull(foodItem.archivedAt)))
    .orderBy(asc(foodItem.name));
```

That query is type-checked end-to-end: the column types, the `where` clause, the result shape. It compiles to ordinary parameterised SQL with no runtime overhead beyond string building.

**Why Drizzle:**
- Serverless-friendly: no generated client, no Rust/binary step, fast cold starts.
- Lets us see the SQL we're writing, which matters for a DB-heavy app.
- First-class Neon support via its drivers.
- Migration tool (`drizzle-kit`) generates raw SQL files we can read.

**Workflow:**
1. Edit `db/app-schema.ts`.
2. `pnpm db:generate` writes a new `NNNN_slug.sql` into `db/migrations/`.
3. `pnpm db:migrate` runs pending migrations. Migrations use the **unpooled** URL because they need a direct connection.

**Transactions:** `await db.transaction(async (tx) => { ... })`. Everything using the `tx` handle is atomic. The onboarding flow uses one to update the user + insert the initial weight log together.

### Validation: Zod

**What it is:** a schema library for runtime validation with TS type inference. Define a schema once, and you get a validator and a TypeScript type for free:

```ts
const FoodSchema = z.object({
    name: z.string().min(1).max(80),
    calories: z.number().int().min(0).max(5000),
});
type FoodInput = z.infer<typeof FoodSchema>;
```

**Where we use it:** at every server boundary. Every server action begins with `const parsed = Schema.parse(input)`. This is our line of defence against malformed clients — browser forms can be bypassed, server actions must validate.

**Zod v4 specifics worth knowing:**
- `z.iso.date()` for `YYYY-MM-DD` strings.
- `z.uuid()`.
- `z.input<typeof S>` vs `z.infer<typeof S>` (aka `z.output`) matters when a schema transforms values — use `input` for form data entering, `infer`/`output` for the validated shape.

### Forms: react-hook-form

**What it is:** a React forms library that avoids re-rendering on every keystroke. You register inputs with refs; the library tracks values without going through `useState`.

**Why:** for forms with many fields (onboarding, food dialog, settings), naïve `useState`-per-field tanks performance on slower phones. RHF + `zodResolver` wires the Zod schema directly into the form's validation.

We use it in the heavier forms (onboarding, food editor, saved-meal builder). Simpler one-off forms just use native `<form>` + server actions with no extra client JS.

### Charts: Recharts

**What it is:** a React charting library built on D3 primitives. You get components like `<LineChart>`, `<Line>`, `<Tooltip>`, and they render into an SVG.

**Why:** simple API, decent touch handling on mobile, works with React 19, no licensing surprises. Used for the weight line chart on `/weight` and the macro donut + adherence bars on `/stats`.

Only imported inside client components (`components/weight-view.tsx`, `components/stats-view.tsx`) — Recharts uses browser APIs and can't render server-side.

### Dates: date-fns and Intl

We deliberately avoid Moment.js (huge, mutable) and keep most date work in the standard library. `lib/date.ts` has a few small helpers:
- `todayInTz(tz)` uses `Intl.DateTimeFormat('en-CA', { timeZone })` to get a `YYYY-MM-DD` for the user's stored timezone. This is critical — "today" for a user in LA at 11pm UTC should still be March 4, not March 5.
- `addDays(date, delta)` operates on the ISO string.
- `formatFriendlyDate` returns "Today" / "Yesterday" / a localized weekday.

`date-fns` is available for anything we need beyond that (tree-shakable, only the functions you import).

### PWA: Serwist

**What it is:** a service-worker framework and the spiritual successor to Google's Workbox. Also provides a Next.js plugin (`@serwist/next`).

**What a service worker is:** a piece of JavaScript the browser installs and runs **in the background**, separate from any tab. It intercepts `fetch` events. A PWA uses this to (a) cache the app shell so the UI loads offline and (b) hook into install/push events.

**How ours works:**
1. `app/sw.ts` declares a Serwist instance using `defaultCache` (sensible runtime caching rules) plus `skipWaiting`, `clientsClaim`, and `navigationPreload`.
2. `next.config.ts` wraps the Next config with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: isDev, cacheOnNavigation: true })`. The `disable: isDev` part matters — you will not see the SW in `pnpm dev`. Do a production build to test it.
3. On first production visit, `components/service-worker-register.tsx` (client component with `useEffect`) calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })`.
4. `app/manifest.ts` describes the installable app (name, icons, theme color, `display: standalone`). iOS Safari's "Add to Home Screen" reads it.
5. Icons: `app/icon.tsx` (standard) and `app/apple-icon.tsx` (iOS) render as `ImageResponse`s at build time. A static `public/icon.svg` provides the manifest's SVG icon.

**Why `--webpack` build:** Serwist hooks into webpack's compilation pipeline to emit the service worker. Next 16's Turbopack hasn't exposed the same hooks yet, so building with Turbopack silently fails with `cacheOnNavigation` / `swSrc` warnings and no SW emitted. We pin the build script to `--webpack` until that changes.

### Tooling: Biome, TypeScript, Vitest, Playwright

- **Biome** — a single Rust binary that replaces ESLint + Prettier + import sorting. Much faster, simpler config. Configured for tabs and double quotes (matching the project style). `pnpm lint:fix` auto-fixes formatting and safe lint rules.
- **TypeScript strict mode** — all files are `.ts` / `.tsx`, all strict checks on. Path alias `@/*` resolves to the project root so `@/db`, `@/lib/auth-server` always work.
- **Vitest** — the `vite`-powered test runner. We use it for pure-function unit tests (`tdee.test.ts`, `date.test.ts`). Fast cold start, Jest-compatible API.
- **Playwright** — headless-browser end-to-end tests. Scaffolded but not heavily used yet; the intended target is the critical flows (signup → onboarding → log a day → view stats).

---

## Data model

Summary (full schema at `db/app-schema.ts` and `db/auth-schema.ts`):

```
user (owned by Better Auth, extended with profile + targets)
  id, email, password via account table
  sex, dateOfBirth, heightIn
  activityLevel, weightGoalLbsPerWeek
  targetCalories, targetProteinG, targetFatG, targetCarbsG
  timezone, onboardedAt

session, account, verification   (Better Auth internals)

weight_log
  (userId, date) UNIQUE  —  one entry per day per user
  weightLbs, note

food_item
  userId, name, brand, servingSize, servingUnit
  calories, proteinG, fatG, carbsG (per one serving)
  archivedAt (soft delete; keeps historical logs pointing at a real row)
  gin_trgm index on name for fuzzy search

saved_meal + saved_meal_item
  named collections of food_item + servings, re-applied to a day

meal_log
  (userId, date, mealType) UNIQUE  —  one row per meal slot per day

meal_log_item
  references meal_log + food_item (food_item FK is nullable with ON DELETE SET NULL)
  servings, sortOrder
  nameSnapshot, caloriesSnapshot, proteinGSnapshot, fatGSnapshot, carbsGSnapshot
```

### The snapshot pattern

This is the most important decision in the schema, and it's worth understanding if you're coming from a background where denormalisation feels wrong.

The naïve design is to store only `mealLogItem.foodItemId` + `servings` and JOIN to `food_item` on read to compute calories and macros. Problem: the moment you edit a `food_item` ("oh actually, these eggs are 80 cal, not 72"), every historical day's totals change retroactively. That's a correctness bug for a weight-loss app — it means the stats page lies about the past.

So we **snapshot** the displayed fields into `meal_log_item` at insert time. Reads use the snapshot. The `food_item_id` link remains for editing convenience ("change this meal-log entry to 2 servings"). Deleting a food sets the link to NULL but the history stays intact.

---

## Security model

**Threat model:** this is an internet-facing single-user app. The primary threats are:
1. An attacker brute-forcing the login.
2. An attacker finding a way to read/write a different user's data — even though there's only one user, a bug could still exfiltrate profile data or corrupt logs.
3. XSS from logged food names (we render them as text).
4. Session hijacking.

**Defences:**

- **Transport:** Vercel terminates TLS; `Strict-Transport-Security` header forces HTTPS for two years (set in `next.config.ts`).
- **Password storage:** argon2id via Better Auth, minimum length 10.
- **Sessions:** HTTP-only, `Secure`, `SameSite=Lax` cookies. 30-day rolling expiry; updated at most daily.
- **Rate limiting:** Better Auth's built-in limiter on `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, password reset.
- **CSRF:** Server actions verify `Origin` header (Next.js default). Better Auth uses its own CSRF token on `/api/auth/*`.
- **SQL injection:** impossible — Drizzle parameterises every query.
- **Authorization:** every server-side query filters by the session's `userId` (from `requireUserId()`). This is **application-level** enforcement; there's no row-level security in Postgres. A bug that forgets the `userId` filter would be a real vulnerability, so it's the thing we watch for in code review.
- **XSS:** React escapes by default; we never use `dangerouslySetInnerHTML`.
- **Security headers** (`next.config.ts`):
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **No CSP yet.** A proper Content-Security-Policy is hard with Next.js inline scripts and worth a dedicated pass; we skipped it for MVP and should add it before this app ever holds anything other than food and weight logs.

---

## Request lifecycle end-to-end

Walk through a specific example: the user is on `/` (Today), taps "Add food" on the Lunch card, picks "Scrambled eggs", confirms 2 servings.

1. **Browser → Vercel edge.** HTTPS POST to the server-action endpoint. The browser has a `better-auth.session_token` cookie. The URL looks like `/today` but the POST body contains an action-ID header that Next.js uses to dispatch.

2. **`proxy.ts`** runs first. It sees the session cookie, doesn't touch the request, returns `NextResponse.next()`.

3. **Vercel function boots** (or reuses a warm instance), imports `.next/server/app/(app)/day/actions.js`, and invokes the specific server action — e.g. `addMealItemAction({ date, mealType: "lunch", foodItemId, servings: 2 })`.

4. **Inside the action:**
    - `await requireUserId()` reads the session cookie, hits `auth.api.getSession(...)` which loads the session + user rows via Drizzle. `cache()` dedupes within this request.
    - `MealItemSchema.parse(input)` validates shape.
    - `await db.transaction(async (tx) => { ... })`:
        - `SELECT` the food row scoped to `userId`.
        - `INSERT` or upsert a `meal_log` for `(userId, date, mealType)`.
        - `INSERT` a `meal_log_item` with the snapshot fields copied from the food row.
    - `revalidatePath("/")` tells Next the Today page's server render cache is stale.

5. **Response.** The action returns a small JSON result. Next.js also sends an RSC payload re-rendering the affected Today view — so the lunch card updates without a full reload.

6. **Browser** applies the RSC payload; React 19 reconciles; the updated meal card is painted.

7. **Service worker (if installed)** sees a GET to the RSC endpoint, may store a copy in runtime cache so the offline fallback has something to show.

Total round-trip on a warm function: typically 80–200 ms from click to repaint, dominated by Neon query latency over WebSocket.

---

## Deployment pipeline

```
local dev
    ↓  git push
GitHub main
    ↓  webhook
Vercel build
    ↓  next build --webpack
  (type-checks, bundles, runs 'db:migrate' if configured, uploads static assets to CDN,
   publishes serverless function bundles)
    ↓
Production deployment
    ↓ (traffic cuts over atomically)
users on yourdomain.com
```

**Preview deployments:** every branch push gets its own URL (`...-branch-git-tony.vercel.app`). Preview deploys point at the production Neon database by default — because this is a one-user app and separate preview databases aren't worth the setup cost. If the app grew, Neon's branching feature would let each PR have its own DB branch.

**Rollbacks:** Vercel's dashboard exposes "Promote to Production" on any prior successful deploy, and it's instant. Great safety net.

**Secrets:** live as environment variables in the Vercel dashboard under Project → Settings → Environment Variables. `BETTER_AUTH_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` are required.

---

## Gotchas we've hit and why they exist

- **"An error occurred in the Server Components render" with no message in production.** Next.js intentionally redacts server error messages in production to avoid leaking internals. The real error is in Vercel's runtime logs. Our first instance of this was the neon-http driver throwing on `db.transaction`; we switched to neon-serverless.

- **`next build` with Turbopack silently drops the service worker.** Serwist is webpack-only today. `package.json` pins `"build": "next build --webpack"`.

- **Biome's `noLabelWithoutControl` can't always detect `<input>` nested inside `<label>`.** If we must, use a `<div>` wrapper with `aria-label`/`aria-labelledby`.

- **Cookie-cache lag with Better Auth.** Better Auth can cache the session in the cookie itself. Disabled for us because onboarding writes `onboardedAt` and the very next request's layout check must see the new value.

- **`DATABASE_URL` vs `DATABASE_URL_UNPOOLED`.** Runtime uses the pooled URL. Migrations use the unpooled URL (they need advisory locks and/or long-running transactions that PgBouncer transaction-pooling mode doesn't support).

- **`metadata.metadataBase` warning.** Without setting an absolute base URL, Open Graph / manifest URLs can be relative. We'll set this once the app has a canonical domain.

- **Timezone.** Storing a per-user IANA tz on the user row and using `Intl.DateTimeFormat` with `en-CA` (which prints `YYYY-MM-DD`) gives us a clean "today" without pulling in a date library. A user who travels sees their logs in the stored tz until they change it in Settings — deliberate, not a bug.
