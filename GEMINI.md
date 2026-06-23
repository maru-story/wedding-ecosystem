# Agent Instructions — Wedding Ecosystem

> This file provides context for AI coding agents (Claude Code, Gemini CLI, Cursor, Copilot, Windsurf, etc.) working on this project. Read this FIRST before making any changes.

---

## Project Identity

**Wedding Ecosystem** — A multi-tenant SaaS platform for digital wedding invitation management, targeting the Indonesian market. Monorepo with 2 frontend apps + 1 backend API (plus a standalone invitation app).

**Status**: Production-deployed. All services live on Vercel (frontend) and Railway (backend).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Apps (Vercel)                  │
├───────────────────┬─────────────────────────────────────────┤
│   Dashboard       │   Scanner (PWA)                         │
│   Next.js 16      │   Next.js 16                            │
│   Port: 3000      │   Port: 3002                            │
└────────┬──────────┴──────────────────┬──────────────────────┘
         │                             │
         └───────────────┬─────────────┘
                             │ REST API + WebSocket (Socket.io)
┌────────────────────────────┴────────────────────────────────┐
│              Backend: Fastify 5 + Socket.io 4.8 (Railway)    │
│                        Port: 4000                            │
├──────────────────────────────────────────────────────────────┤
│  Auth │ Guests │ Events │ RSVP │ Check-in │ CMS │ Scanner   │
└────────┬──────────────────────┬──────────────────────────────┘
         │                      │
    ┌────┴────┐           ┌─────┴─────┐
    │PostgreSQL│           │   Redis    │
    │(Supabase)│           │ (Upstash)  │
    └──────────┘           └───────────┘
```

---

## Monorepo Structure

```
/
├── apps/
│   ├── dashboard/          # Client & WO Dashboard (Next.js 16, responsive, desktop-first)
│   └── scanner/            # Scanner PWA (Next.js 16, offline-first, camera access)
├── packages/
│   ├── api/                # Backend API (Fastify 5, single service handles REST + WebSocket)
│   │   ├── src/config/     # Production config, database, Redis, logger
│   │   ├── src/middleware/  # CORS, rate limiting, tenant isolation, RBAC, encryption
│   │   ├── src/plugins/    # Audit logger, response cache, security headers, request validation
│   │   ├── src/routes/     # Route handlers (auth, guests, events, checkin, rsvp, cms, scanner, messages, invitations, invitation-deliveries, health)
│   │   └── src/services/   # Business logic layer
│   ├── db/                 # Prisma 7 schema, migrations, client factory
│   ├── shared/             # Shared TypeScript types, Zod schemas, enums, error codes, utilities
│   └── realtime/           # Socket.io server (room-based, auth middleware, graceful shutdown)
├── .github/workflows/      # CI/CD (tests, deploy-backend, deploy-frontend, smoke-test, secret-scanning)
├── scripts/                # Utility scripts (domain setup, CDN config, secret detection)
├── .env.example            # Template for all environment variables
├── .env.local              # Local development env (gitignored)
├── package.json            # Root monorepo config (npm workspaces + Turborepo)
└── turbo.json              # Turborepo task configuration
```

---

## Tech Stack (Pinned Versions)

| Layer      | Technology                  | Version                                       |
| ---------- | --------------------------- | --------------------------------------------- |
| Frontend   | Next.js                     | 16.2                                          |
| UI         | React                       | 19.2                                          |
| Styling    | TailwindCSS                 | 4.3 (CSS-first config, no tailwind.config.ts) |
| Components | shadcn/ui                   | latest (copy-paste pattern)                   |
| Animation  | Motion (Framer Motion)      | 12.17+                                        |
| Backend    | Fastify                     | 5.8                                           |
| ORM        | Prisma                      | 7.7 (with @prisma/adapter-pg)                 |
| WebSocket  | Socket.io                   | 4.8                                           |
| Cache      | Redis via ioredis           | 5.10                                          |
| Auth       | JWT (jsonwebtoken) + bcrypt | 9.0 / 6.0                                     |
| Validation | Zod                         | 3.25                                          |
| Testing    | Vitest + fast-check         | 3.2 / 4.8                                     |
| E2E Test   | Playwright                  | 1.55.1                                        |
| Language   | TypeScript                  | 5.9                                           |
| Monorepo   | npm workspaces + Turborepo  | 2.4                                           |
| Node.js    | Minimum                     | 20.0.0                                        |

**IMPORTANT**: All dependency versions are PINNED (no ^ or ~ ranges). Do NOT upgrade versions without explicit instruction.

---

## Language & Locale Conventions

| Context                                                  | Language / Format                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Variable names, function names, comments, docs           | **English** (all apps)                                                                                                     |
| UI labels, button text, error messages, user-facing copy | **Bahasa Indonesia** (Dashboard/Scanner); **English** (guest-facing Invitation app)                                        |
| Date format                                              | `DD MMMM YYYY` (e.g., "12 Januari 2026") (Dashboard/Scanner); `Month DD, YYYY` (e.g., "January 12, 2026") (Invitation app) |
| Currency                                                 | IDR (Rp), no decimal places                                                                                                |
| Time zone                                                | WIB (Asia/Jakarta, UTC+7)                                                                                                  |

---

## User Roles & Permissions

| Role             | Scope          | Can Do                                   | Cannot Do            |
| ---------------- | -------------- | ---------------------------------------- | -------------------- |
| Admin            | All tenants    | Full CRUD, tenant management, QR scanner | —                    |
| Client           | Own tenant     | Manage events, guests, CMS, QR scanner   | Access other tenants |
| WO               | Disabled (MVP) | None (restricted in MVP)                 | All actions          |
| Scanner Operator | Disabled (MVP) | None (restricted in MVP)                 | All actions          |

---

## Core Domain Rules (MUST FOLLOW)

1. **Tenant isolation** — EVERY database query MUST be scoped by `tenant_id`. Never expose data across tenants.
2. **Personalized URLs** — Format: `/{event-slug}?to={guest-slug}`. The guest-slug determines the name on the cover.
3. **QR uniqueness** — One QR code per guest per event. Payload contains `guest_id` + `event_id`.
4. **Duplicate detection** — Allow duplicate check-ins. Subsequent scans increment the `scan_count` counter and return a success status (GREEN).
5. **Go-Show flow** — Walk-in guests added on-site. Temporary record, no QR code, immediately checked in.
6. **CMS sections** — 15 configurable sections per invitation (cover, bride_groom, bride, groom, story, verse, countdown, akad_resepsi, rsvp, gallery, video, gift, messages, closing, music). Each toggleable and reorderable.
7. **RSVP states** — `pending` | `confirmed` | `declined` | `checked_in`.
8. **Real-time broadcast** — Check-in and RSVP updates broadcast via WebSocket, scoped to event room.
9. **Offline queue** — Scanner stores actions in IndexedDB when offline, syncs on reconnect. Conflict resolution: server timestamp wins.
10. **Event capacity** — Max 2000 guests per event.

---

## API Endpoints Reference

### Auth (No auth required)

- `POST /auth/login` — Login, returns JWT access_token (15min) + refresh_token (7 days)
- `POST /auth/refresh` — Refresh access token

### Auth (Auth required)

- `PUT /auth/profile` — Update client name and email
- `PUT /auth/change-password` — Change password (requires current password)

### Events (Auth required)

- `GET /events` — List events for tenant
- `POST /events` — Create a new wedding event
- `GET /events/current` — Get current tenant's latest event
- `GET /events/current/stats` — Get current event statistics
- `GET /events/:id/stats` — Get event statistics (guests, RSVPs, check-ins)
- `GET /events/:id/rsvp` — Get RSVP list for event
- `PUT /events/:id` — Update wedding event details
- `POST /events/:id/media/upload` — Upload media file (image/video/audio) to Cloudflare R2 (optional query param `?section=` structure: e.g., `cover`, `gallery`, `story`)

### Guests (Auth required)

- `GET /guests` — List guests (paginated, filterable by group)
- `POST /guests` — Create guest (auto-generates QR)
- `PUT /guests/:id` — Update guest
- `DELETE /guests/:id` — Delete guest and deactivate QR
- `GET /guests/search?q=&event_id=` — Search by name (min 2 chars)
- `GET /guests/:id/qr` — Get QR code data
- `GET /guests/groups` — Unique group names in current event
- `PATCH /guests/groups/reassign` — Reassign all guests from one group to another (body: `{from, to}`)
- `POST /guests/import` — Bulk import from CSV
- `GET /guests/export` — Export guests to CSV file
- `POST /guests/bulk-delete` — Bulk delete guests and deactivate their QR codes

### Check-in (Auth required)

- `POST /checkin/scan` — QR scan verification (returns GREEN/RED)
- `POST /checkin/manual` — Manual check-in by guest_id
- `POST /checkin/go-show` — Register + check-in walk-in guest
- `POST /checkin/sync` — Sync offline check-in records

### RSVP (No auth — public)

- `POST /rsvp` — Submit RSVP

### CMS (Auth required)

- `GET /cms/sections/:eventId` — Get all sections

### Scanner (Auth required)

- `POST /scanner/devices/register` — Register scanner device (max 2 per event)
- `GET /scanner/devices/:eventId` — List active devices
- `GET /scanner/guests/:eventId` — Get guest cache for offline use
- `PUT /scanner/devices/:deviceId/heartbeat` — Update heartbeat
- `DELETE /scanner/devices/:deviceId` — Deactivate device

### Invitations (No auth — public)

- `GET /invitations/:eventSlug/:guestSlug` — Get personalized invitation (event, guest, theme, sections, share metadata)
- `GET /invitations/:eventSlug` — Get event data with share_title, share_description, share_image_url

### Messages (No auth — public)

- `POST /messages` — Send wish/message
- `GET /messages/:eventId` — Get messages for event

### Messages (Auth required)

- `GET /messages/:eventId/admin` — Get all messages (visible and hidden) for event
- `PUT /messages/:messageId/visibility` — Toggle visibility of a message
- `DELETE /messages/:messageId` — Delete a message

### Invitation Deliveries (Auth required)

- `GET /invitation-deliveries/message-template` — Get message template for event
- `PUT /invitation-deliveries/message-template` — Update message template for event
- `POST /invitation-deliveries/send` — Send single invitation via WhatsApp Web redirect

### Health (No auth)

- `GET /health` — Returns status of PostgreSQL, Redis, WebSocket

### Platform Admin (Auth required + Admin role)

- `GET /admin/stats` — Get global platform KPIs
- `GET /admin/tenants` — List all tenants (paginated, search, filter)
- `POST /admin/tenants` — Create a new tenant with master client credentials
- `PATCH /admin/tenants/:id/status` — Toggle tenant active/inactive status
- `DELETE /admin/tenants/:id` — Delete a tenant (cascades to delete users, events, configs, guests, check-ins)
- `GET /admin/users` — List all users across the platform (paginated, search, role filters, is_active status)
- `PATCH /admin/users/:id/status` — Toggle user active/inactive status (suspend/activate account)
- `DELETE /admin/users/:id` — Delete a user (blocks self-deletion and deleting any administrator-role users)
- `POST /admin/users/admin` — Create a new platform administrator
- `PUT /admin/users/:id/reset-password` — Generate and reset user password with secure random string
- `GET /admin/audit-logs` — List platform-wide system audit logs with pagination, search, action filter, and date-range filters (`start_date`/`end_date`)
- `GET /admin/tenants/:id/events` — List events for a tenant with their config limits
- `PATCH /admin/events/:eventId/config` — Update event config limits

---

## WebSocket Events

Server uses Socket.io with room-based architecture. Clients join `event:{eventId}` room.

**Authentication**: JWT token passed via `auth: { token }` on handshake.

**Events emitted by server**:

- `guest_checked_in` — When a guest checks in
- `rsvp_updated` — When RSVP is submitted
- `go_show_added` — When Go-Show guest is registered
- `stats_updated` — Updated event statistics

**Events emitted by client**:

- `join_event` — Join an event room
- `leave_event` — Leave an event room

---

## Database Schema (Key Tables)

```
tenants → users → events → guests → qr_codes
                         → event_configs
                         → invitation_sections
                         → scanner_devices
                         → messages
                   guests → rsvps
                         → check_ins
```

Every table with user data has `tenant_id` for isolation. See `packages/db/prisma/schema.prisma` for full schema.

---

## Key Architectural Decisions

| Decision                                       | Rationale                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Single API service (REST + WebSocket combined) | At ≤500 guests, no need for separate WS service                   |
| Single Redis instance (cache + pub/sub)        | Traffic negligible at current scale                               |
| No clustering                                  | Single Fastify process handles the load                           |
| In-memory rate limiter fallback                | Redis-backed primary, graceful degrade without Redis              |
| PrismaClient with pg adapter                   | Direct PostgreSQL connection with pool management                 |
| JWT in localStorage (Scanner)                  | PWA needs persistence across reloads, acceptable for scanner-only |

---

## Common Commands

```bash
npm install                    # Install all dependencies
npm run dev                    # Run all apps + API via Turborepo
npm run build                  # Build all packages
npm run test                   # Run all tests
npm run test:e2e --workspace=packages/api # Run Playwright E2E tests
npm run lint                   # Lint all packages

# Per-package
npx turbo dev --filter=@wedding/api          # API only
npx turbo dev --filter=@wedding/dashboard    # Dashboard only
npx turbo test --filter=@wedding/api         # API tests only
npx turbo build --filter=@wedding/api...     # Build API + dependencies

# Database
npx prisma migrate dev --schema=packages/db/prisma/schema.prisma   # Create migration
npx prisma migrate deploy                                           # Apply migrations (production)
npx prisma generate --schema=packages/db/prisma/schema.prisma      # Generate client
npx prisma studio --schema=packages/db/prisma/schema.prisma        # Visual DB browser
```

---

## Environment Variables

### Backend (packages/api)

```env
NODE_ENV=development|production
PORT=4000
DATABASE_URL=postgresql://...
DATABASE_POOLED_URL=postgresql://...:6543/...  # PgBouncer (production)
UPSTASH_REDIS_CACHE_URL=redis://localhost:6379  # or rediss://... for TLS
JWT_SECRET=<secret>
REFRESH_SECRET=<secret>
DASHBOARD_ORIGIN=http://localhost:3000
INVITATION_ORIGIN=http://localhost:3001
SCANNER_ORIGIN=http://localhost:3002
R2_ACCOUNT_ID=<cloudflare-r2>
R2_ACCESS_KEY_ID=<r2-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_BUCKET_NAME=wedding-ecosystem
R2_PUBLIC_URL=https://cdn.domain.com
```

### Frontend (all apps)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_INVITATION_URL=http://localhost:3001
NEXT_PUBLIC_CDN_URL=https://cdn.maruplanner.my.id
```

---

## Testing Conventions

- **Framework**: Vitest 3.2
- **Property-based**: fast-check 4.8
- **Test files**: Co-located with source (`*.test.ts`, `*.property.test.ts`)
- **Coverage target**: 80% for business logic
- **Run**: `npm run test` or `npx turbo test --filter=@wedding/api`
- **DO NOT** add unit/property-based tests unless explicitly asked. However, E2E check and E2E test updates are mandatory for new features.
- **DO NOT** use `--watch` mode in commands (use `--run` for single execution)
- **E2E Testing Rule**: Every time a new feature is added or a new capability is implemented, you MUST perform an E2E check (`npm run test:e2e --workspace=packages/api`) and write/update E2E tests for it. If the improvement/feature is a minor text change, documentation update, or styling fix that does not need testing, you may skip it.

---

## Deployment

| Service         | Platform      | Config File                  |
| --------------- | ------------- | ---------------------------- |
| Dashboard       | Vercel        | `apps/dashboard/vercel.json` |
| Scanner         | Vercel        | `apps/scanner/vercel.json`   |
| API + WebSocket | Railway       | `packages/api/railway.toml`  |
| Database        | Supabase      | Managed PostgreSQL           |
| Cache           | Upstash       | Serverless Redis             |
| CDN/Storage     | Cloudflare R2 | —                            |

CI/CD via GitHub Actions:

- `ci.yml` — Tests + security gate (blocks deploy on failure)
- `deploy-backend.yml` — Blue-green deployment with auto-rollback
- `deploy-frontend.yml` — Per-app Vercel deployment with smoke tests
- `smoke-test.yml` — Post-deploy health/CDN/WebSocket verification
- `secret-scanning.yml` — Detects committed secrets

---

## Rules for AI Agents

### MUST DO

1. **Read relevant code before modifying** — Never guess file contents.
2. **Maintain tenant isolation** — Every new query MUST include `tenant_id` filter.
3. **Use Bahasa Indonesia for UI text** — All user-facing strings in Indonesian.
4. **Use English for code** — Variables, functions, comments in English.
5. **Pin dependency versions** — No `^` or `~` in app packages.
6. **Update README.md** — After adding/changing features, update the relevant README section.
7. **Follow existing patterns** — Look at similar files before creating new ones.
8. **Use Zod for validation** — All input validation uses Zod schemas from `@wedding/shared`.
9. **Use standard validation helper** — Use the `validate(data, schema, reply)` helper in all Fastify routes to ensure consistent error handling and type safety.
10. **Authenticated Request Pattern** — In protected routes, use `request.user!` to access the authenticated context. The `FastifyRequest` is augmented with `user?: AuthUser`, and the `onRequest` auth hook ensures it exists.
11. **Scope WebSocket broadcasts to event rooms** — Never broadcast globally.
12. **Handle offline gracefully** — Scanner features must work without network.
13. **Frontend Component & Library Consistency** — When building new pages, sections, or form fields in the frontend, first inspect `apps/*/src/components/ui/` to see what shadcn/UI components exist (e.g., `Button`, `Input`, `Label`, `Textarea`, `Dialog`). Always import and use these shared components rather than fallback HTML tags (`<button>`, `<input>`, `<textarea>`, etc.). If a shadcn component does not exist but fits the standard, create the shadcn-compliant component in the workspace's UI folder following existing patterns, then use it consistently. Check `package.json` for installed packages (e.g. framer-motion, lucide-react) to prevent writing custom implementations or installing redundant packages.
14. **Mandatory E2E Check** — Every time a new feature is added or a new capability is implemented, always write/update E2E tests and run them (`npm run test:e2e --workspace=packages/api`). If the improvement or feature doesn't need the E2E test (e.g. documentation, minor text adjustments, or formatting changes), you may skip the test.
15. **Release Report Generation Prompt** — Whenever you detect a version bump in any package (e.g., changes to `"version"` in `package.json` for dashboard, scanner, api, or invitation client) during commit preparation, release preparation, or version tags creation, you **MUST** proactively ask the user: *"Saya melihat ada kenaikan versi aplikasi. Apakah Anda ingin saya membuat laporan pembaruan PDF otomatis untuk versi ini?"*. If approved, invoke the `wedding-report-generator` skill.

### MUST NOT DO

1. **DO NOT** upgrade dependency versions without explicit instruction.
2. **DO NOT** add tests unless explicitly asked.
3. **DO NOT** create staging environments or add complexity beyond current scale.
4. **DO NOT** use `any` type — use proper TypeScript types.
5. **DO NOT** expose secrets in code or logs.
6. **DO NOT** break tenant isolation (cross-tenant data access).
7. **DO NOT** use `tailwind.config.ts` — TailwindCSS 4 uses CSS-first configuration.
8. **DO NOT** add new dependencies without checking if existing ones cover the use case.
9. **DO NOT** modify `.env` or `.env.local` files (they contain secrets).
10. **DO NOT** use interactive commands (`--watch`, editors) in terminal.

### Code Style

- **Formatting**: Prettier (auto-configured)
- **Linting**: ESLint with TypeScript plugin
- **Imports**: Use `@wedding/shared`, `@wedding/db`, `@wedding/realtime` for cross-package imports
- **Path aliases**: Frontend apps use `@/` for `src/` directory
- **Error responses**: `{ success: false, error: { code: string, message: string } }`
- **Success responses**: `{ data: T, pagination?: { page, per_page, total, total_pages } }`
- **Auth header**: `Authorization: Bearer <token>`

### When Adding New Features

1. Check `packages/shared/src/types/` for existing types/enums
2. Add route in `packages/api/src/routes/`
3. Add service logic in `packages/api/src/services/`
4. Use `app.addHook('onRequest', authenticate)` for protected routes
5. Always filter by `tenant_id` from `request.user.tenant_id`
6. Broadcast real-time updates via `realtime.broadcastX()` if relevant
7. Update `README.md` with the new feature

### When Fixing Bugs

1. Read the relevant route, service, and test files first
2. Check if there's a property-based test that covers the case
3. Fix the root cause, not symptoms
4. Verify the fix doesn't break tenant isolation

---

## Demo Credentials (Local Development)

| Role   | Email / Username  | Password      | Tenant / Scope |
| ------ | ----------------- | ------------- | -------------- |
| Admin  | `admin`           | `password123` | System Admin   |
| Client | `demo`            | `123123123`   | Wedding Demo   |

**Tenant (Wedding Demo)**: Wedding Demo
**Event (Romeo & Juliet)**: Romeo & Juliet (slug: `romeo-juliet`)

---

## File Reference Quick Links

| What                          | Where                                             |
| ----------------------------- | ------------------------------------------------- |
| Database schema               | `packages/db/prisma/schema.prisma`                |
| API entry point               | `packages/api/src/index.ts`                       |
| API routes                    | `packages/api/src/routes/*.ts`                    |
| Shared types                  | `packages/shared/src/types/`                      |
| Zod schemas                   | `packages/shared/src/types/validation.ts`         |
| Error codes                   | `packages/shared/src/types/errors.ts`             |
| WebSocket server              | `packages/realtime/src/index.ts`                  |
| WS auth middleware            | `packages/realtime/src/middleware/auth.ts`        |
| Playwright E2E Config         | `packages/api/playwright.config.ts`               |
| Playwright E2E Tests          | `packages/api/tests/e2e/`                         |
| Scanner auth                  | `apps/scanner/src/lib/auth.ts`                    |
| Scanner offline queue         | `apps/scanner/src/lib/offline-queue.ts`           |
| Dashboard socket hook         | `apps/dashboard/src/hooks/use-socket.ts`          |
| Dashboard table state hook    | `apps/dashboard/src/hooks/use-table-state.ts`     |
| Dashboard DataTable component | `apps/dashboard/src/components/ui/data-table.tsx` |
| Production config             | `packages/api/src/config/production.ts`           |
| Redis config                  | `packages/api/src/config/redis.ts`                |
| CORS middleware               | `packages/api/src/middleware/cors.middleware.ts`  |
| CI/CD workflows               | `.github/workflows/`                              |
| Deploy config (API)           | `packages/api/railway.toml`                       |
| Deploy config (Frontend)      | `apps/*/vercel.json`                              |
| Design system                 | `.agents/summary/design-system.md`                |
