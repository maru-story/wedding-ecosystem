---
inclusion: always
---

# Project Structure

Monorepo with three frontend apps sharing a single backend API. Currently in early implementation phase — shared types and utilities are defined.

## Layout

```
/
├── apps/
│   ├── dashboard/        # Client & Admin Dashboard (Next.js 16, responsive)
│   ├── invitation/       # Guest-facing invitation app (Next.js 16, mobile-first)
│   └── scanner/          # Scanner PWA (Next.js 16)
├── packages/
│   ├── api/              # Backend API server (Fastify 5)
│   ├── db/              # Database schema, migrations, ORM config (Prisma 7)
│   ├── shared/           # Shared types, utilities, constants (Zod 3.25)
│   └── realtime/         # WebSocket/Socket.io 4.8 server
├── .kiro/
│   ├── specs/            # Feature specifications
│   ├── steering/         # AI steering rules (this folder)
│   └── settings/         # Kiro IDE settings
└── .vscode/              # VS Code workspace settings
```

## Current State

Production-ready foundation. Backend refactored to align with ECC coding standards:

- **Type-safe routes**: All route handlers use `AuthenticatedRequest` context.
- **Unified validation**: Standardized `validate` helper enforces shared Zod schemas.
- **Modular plugins**: Core logic extracted into focused Fastify plugins.
- **Clean repositories**: Removed all `any` casts, using explicit Prisma types.
- **Standardized errors**: Centralized `ErrorCode` enum used across all packages.

`packages/shared/src/types/` is implemented with:

- Enums, interfaces, Zod validation schemas, error codes, and API response types

## Key Architectural Patterns

- **Multi-tenant**: Every DB table includes `tenant_id`; row-level isolation at query layer.
- **Service-based backend**: Modular services (Auth, Guest, QR, CMS, Check-in, Real-time, Invitation-Delivery) on Fastify 5.
- **Room-based WebSocket**: Broadcasts scoped per-event room for data isolation (Socket.io 4.8).
- **PWA offline-first**: Scanner uses service worker + local queue for offline operation.
- **CMS-driven rendering**: Invitation sections dynamically rendered based on active config and sort order.
- **TailwindCSS 4**: Uses the new CSS-first configuration (no tailwind.config.ts needed for basic setup).

## Conventions

- Code language: English (variable names, comments)
- UI/content language: Indonesian (Bahasa Indonesia)
- Feature specs: `.kiro/specs/{feature-name}/`
- Spec config: `.config.kiro` JSON files
- Invitation URLs: `/{event-slug}?to={guest-slug}`
- All dependency versions are pinned (no ^ or ~ ranges in app packages)
- Node.js minimum: 22.13.0
