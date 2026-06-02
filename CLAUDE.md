# Project Instructions — Wedding Ecosystem

## Tech Stack
- **Monorepo**: Turborepo + npm Workspaces
- **Backend**: Fastify 5.8 (REST + Socket.io)
- **Frontend**: Next.js 16.2 (App Router), TailwindCSS 4, shadcn/ui
- **Database**: Prisma 7.7 + PostgreSQL (Supabase)
- **Validation**: Zod 3.25
- **Testing**: Vitest 3.2 (Unit/Integration), Playwright 1.55 (E2E)

## Code Style
- **Naming**: kebab-case for files/folders. camelCase for variables/functions.
- **UI Text**: Always use **Bahasa Indonesia** for user-facing copy.
- **Code**: Always use **English** for code, comments, and documentation.
- **Immutability**: Avoid mutation. Use object spread or array methods.
- **Validation**: Use Zod schemas from `@wedding/shared` and the `validate()` helper in routes.

## Tenant Isolation (CRITICAL)
- **MANDATORY**: Every database query must filter by `tenant_id` from `request.user.tenant_id`.
- **Isolation Check**: Never expose data across tenants.

## Testing
- **Run Unit/Integration**: `npm run test` (turbo)
- **Run E2E**: `npm run test:e2e --workspace=packages/api`
- **TDD**: Write Vitest tests for services before implementation.
- **E2E Check**: Mandatory E2E verification for every new feature or major change.

## Build & Run
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **DB Client**: `npm run postinstall` (prisma generate)

## Project Structure
- `apps/dashboard`: Next.js admin dashboard (Port 3000)
- `apps/invitation`: Next.js guest landing page (Port 3001)
- `apps/scanner`: Next.js scanner PWA (Port 3002)
- `packages/api`: Fastify backend (Port 4000)
- `packages/db`: Prisma schema & client
- `packages/shared`: Shared Zod schemas, types, and constants
- `packages/realtime`: Socket.io logic

## Conventions
- **API Envelopes**: Success: `{ data: T }`, Error: `{ success: false, error: { code, message } }`.
- **Zod**: Centralize all schemas in `packages/shared/src/types/validation.ts`.
- **Dependencies**: Pin versions (no `^` or `~`). Check if existing packages cover the use case before adding new ones.
