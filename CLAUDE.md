# CLAUDE.md — Low Carbon Alerts (Nuxt 4)

## Project Overview

A fullstack dashboard application for managing low-carbon alerts. It has two distinct audiences:

- **Admin section** (`/admin/**`) — authenticated dashboard for administrators (customers, inbox, settings). Login via email + password only at `/admin-login`. No public signup.
- **End-user section** (`/app/**`) — view-only personal dashboard for registered end-users. Login at `/login`, signup at `/signup` (email + password or Google OAuth).

**Deployed to:** Cloudflare Pages (`https://hiilivahti.fi`)  
**Auto-deploy:** GitHub Actions on push to `main`

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Nuxt 4 (Composition API, `<script setup>`) |
| Build tool | Vite (via Nuxt) |
| Styling | Tailwind CSS v4 |
| UI Components | Nuxt UI v3 (`@nuxt/ui`) |
| Language | TypeScript |
| Auth | `nuxt-auth-utils` (sealed session cookies) |
| Database | Cloudflare D1 (serverless SQLite) via Drizzle ORM |
| Deployment | Cloudflare Pages (Nitro preset: `cloudflare-pages`) |
| Package manager | pnpm |

---

## File Structure

```
low-carbon-alerts/
├── .claude/
│   ├── CLAUDE.md         ← you are here
│   └── commands/         ← custom slash commands
├── .github/workflows/
│   └── deploy.yml        ← auto-deploy on push to main
├── app/
│   ├── components/       ← reusable UI components
│   ├── composables/      ← shared composables (useLogout, useDashboard)
│   ├── layouts/
│   │   ├── admin.vue     ← sidebar layout for admin section
│   │   ├── app.vue       ← minimal header layout for end-users
│   │   └── auth.vue      ← centered card layout for login/signup pages
│   ├── middleware/
│   │   └── auth.ts       ← named route guard (role-based, not global)
│   └── pages/
│       ├── index.vue           ← smart redirect based on session role
│       ├── login.vue           ← end-user login
│       ├── signup.vue          ← end-user signup
│       ├── admin-login.vue     ← admin-only login
│       ├── admin/              ← admin dashboard pages
│       └── app/                ← end-user portal pages
├── server/
│   ├── api/
│   │   ├── admin/        ← admin-only API routes
│   │   └── auth/         ← login, signup, logout, google OAuth, seed-admin
│   └── database/
│       ├── schema.ts     ← Drizzle schema (users table)
│       ├── index.ts      ← useDrizzle() helper (reads D1 binding from event context)
│       └── migrations/   ← SQL migrations (drizzle-kit generated)
├── shared/types/
│   └── auth.d.ts         ← nuxt-auth-utils User/UserSession type augmentation
├── wrangler.toml         ← Cloudflare Pages + D1 binding config
├── drizzle.config.ts
└── nuxt.config.ts
```

---

## Dev & Build Commands

```bash
npm run dev           # Nuxt dev server at localhost:3000 (D1 via nitro-cloudflare-dev)
npm run build         # Production build to dist/
npm run typecheck     # tsc --noEmit

# Database
pnpm db:generate      # drizzle-kit generate — creates SQL migration from schema changes
pnpm db:migrate:local # apply migrations to local D1 (.wrangler/state/)
pnpm db:migrate:remote # apply migrations to production D1 (requires wrangler login)
```

> `npm run dev` supports D1 bindings via `nitro-cloudflare-dev` — no need to run `wrangler pages dev`.

---

## Auth Architecture

- Sessions managed by `nuxt-auth-utils` (sealed cookies, no localStorage).
- `useUserSession()` — composable for reading session, `clear()` for logout.
- `useLogout()` — shared composable in `app/composables/useLogout.ts` that clears the session and redirects based on role (`admin` → `/admin-login`, `user` → `/login`).
- Route guard: `app/middleware/auth.ts` (named, applied via `definePageMeta({ middleware: 'auth' })`).
  - `/admin/**` requires `role === 'admin'`, redirects to `/admin-login`.
  - `/app/**` requires any authenticated session, redirects to `/login`.
- Google OAuth handled by `server/api/auth/google.get.ts` (end-users only; admin accounts blocked with 403).
- First admin is seeded via `POST /api/auth/seed-admin` (requires `NUXT_SETUP_TOKEN`).

---

## Database Schema

Single `users` table (`server/database/schema.ts`):

| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID) | primary key |
| `email` | text | unique, lowercased |
| `name` | text | nullable |
| `passwordHash` | text | null for Google-only accounts |
| `role` | `'admin' \| 'user'` | default `'user'` |
| `googleId` | text | nullable, unique |
| `avatarUrl` | text | nullable |
| `status` | `'active' \| 'inactive'` | default `'active'` |
| `createdAt` | integer (timestamp) | set on insert |
| `lastLoginAt` | integer (timestamp) | updated on each login |

**Migration workflow:** edit `schema.ts` → `pnpm db:generate` → `pnpm db:migrate:local` → `pnpm db:migrate:remote` after deploy.

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NUXT_SESSION_PASSWORD` | `.env` + Cloudflare Pages | 32+ char secret for sealing session cookies |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | `.env` + Cloudflare Pages | Google OAuth client ID |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | `.env` + Cloudflare Pages | Google OAuth client secret |
| `NUXT_SETUP_TOKEN` | `.env` + Cloudflare Pages (remove after seeding) | One-time admin seed token |

Local dev: copy to `.env` and `.dev.vars` (both gitignored).

---

## Code Conventions

- All components use `<script setup lang="ts">`.
- No `any` — use `unknown` + type guards at boundaries.
- No `console.log` in committed code.
- Prettier formats on save: single quotes, no semicolons (`.prettierrc`).
- All external links: `target="_blank" rel="noopener noreferrer"`.
- `v-for` always has `:key` bound to a stable unique ID.
- Admin-only API routes live under `server/api/admin/` (no additional auth middleware yet — relies on session guard in calling pages).

---

## Deployment

Auto-deploys via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`:
1. Build with `pnpm run build` → outputs to `dist/`
2. Deploy with `wrangler pages deploy dist --project-name=low-carbon-alerts`

Production D1 migration must be run manually after schema changes:
```bash
pnpm db:migrate:remote
```
