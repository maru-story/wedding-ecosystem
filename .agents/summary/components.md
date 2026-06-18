# Components

## Component Map

```mermaid
graph TB
    subgraph "Frontend Apps"
        D["Dashboard"]
        S["Scanner"]
        I["Invitation (Standalone)"]
    end

    subgraph "Backend Packages"
        API["API Server"]
        RT["Realtime"]
        DB["Database"]
        SH["Shared"]
    end

    D --> API
    I --> API
    S --> API
    S --> RT
    D --> RT
    API --> DB
    API --> SH
    RT --> DB
    D --> SH
    I --> SH
    S --> SH
```

## Backend Components

### API Server (`packages/api`)

The central backend service handling all REST endpoints and coordinating business logic.

```mermaid
graph TB
    subgraph "packages/api/src"
        Index["index.ts<br/>(Server bootstrap, graceful shutdown)"]
        Config["config/<br/>(DB, Redis, logger, production, encryption, secret-rotation)"]
        MW["middleware/<br/>(CORS, RBAC, tenant-isolation, encryption, validate-helper)"]
        Plugins["plugins/<br/>(auth, request-logger, rate-limiter, response-cache, security-headers)"]
        Routes["routes/<br/>(thin HTTP adapters using AuthenticatedRequest)"]
        Services["services/<br/>(Business logic: slug generation, QR, PII, deduplication)"]
        Repos["repositories/<br/>(Type-safe Prisma adapters — all queries scoped by tenant_id)"]
    end

    Index --> Config
    Index --> Plugins
    Plugins --> Routes
    Routes --> MW
    Routes --> Services
    Services --> Repos
```

#### Services

| Service                     | File                                                 | Responsibility                                                                       |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `AuthService`               | `auth/auth.service.ts`                               | Login, JWT generation/verification, password hashing, token refresh, account lockout |
| `GuestService`              | `guest/guest.service.ts`                             | CRUD guests, QR code generation, encrypted payloads, slug generation                 |
| `CheckInService`            | `checkin/checkin.service.ts`                         | QR verification, manual check-in, go-show registration, duplicate detection          |
| `RsvpService`               | `rsvp/rsvp.service.ts`                               | RSVP submission and retrieval                                                        |
| `CMSService`                | `cms/cms.service.ts`                                 | Section CRUD, sort order management, toggle active state                             |
| `EventService`              | `event/event.service.ts`                             | Event creation with default sections and theme                                       |
| `InvitationDeliveryService` | `invitation-delivery/invitation-delivery.service.ts` | Single invitation sending (WhatsApp), message template and delivery status tracking  |
| `ScannerDeviceService`      | `scanner-device/scanner-device.service.ts`           | Device registration, lane assignment, heartbeat, max 2 per event                     |
| `MediaUploadService`        | `media-upload/media-upload.service.ts`               | File validation, virus scanning, cloud storage upload                                |
| `StorageService`            | `storage/storage.ts`                                 | R2 client, signed URLs, tenant storage quota enforcement                             |
| `GuestImportService`        | `guest-import/guest-import.service.ts`               | CSV parsing, bulk import (max 2000 rows), deduplication                              |
| `AdminService`              | `admin/admin.service.ts`                             | Platform admin: platform KPIs, tenant management, user listing, password resets      |

#### Repositories

| Repository                | File                        | Responsibility                                   |
| ------------------------- | --------------------------- | ------------------------------------------------ |
| `PrismaGuestRepository`   | `guest/guest.repository.ts` | Type-safe Prisma adapter for guests and QR codes |
| `PrismaCheckInRepository` | `checkin.repository.ts`     | Manual and QR-based check-in persistence         |
| `PrismaCMSRepository`     | `cms.repository.ts`         | Section content and sort-order management        |
| `PrismaRsvpRepository`    | `rsvp.repository.ts`        | Guest RSVP state persistence                     |
| `PrismaAdminRepository`   | `admin.repository.ts`       | Platform-wide stats and tenant/user management   |

#### Middleware Stack

| Middleware         | Purpose                                                | Path                                              |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------- |
| `CORS`             | Per-app origin validation                              | `cors/cors.middleware.ts`                         |
| `RBAC`             | Role-based access enforcement                          | `rbac/rbac.middleware.ts`                         |
| `Tenant Isolation` | Extracts `tenant_id` from JWT                          | `tenant-isolation/tenant-isolation.middleware.ts` |
| `Encryption`       | Transparent PII encryption/decryption                  | `encryption/encryption.ts`                        |
| `Validate`         | Unified input validation helper                        | `validate.ts`                                     |
| `Media Upload`     | File validation and virus scanning                     | `media-upload/media-upload.middleware.ts`         |
| `Input Validation` | Legacy Zod middleware (migrating to `validate` helper) | `input-validation/input-validation.middleware.ts` |

#### Plugins

| Plugin             | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `auth`             | Registers `authenticate` decorator and enriches logger with `tenant_id`    |
| `request-logger`   | Structured tracing by adding unique `request_id` to all logs               |
| `rate-limiter`     | Standardized categorical rate limiting (general, auth, scanner) with Redis |
| `response-cache`   | Symbol-based caching with pattern invalidation on successful writes        |
| `audit-logger`     | Auto-log sensitive operations using `Prisma.InputJsonValue`                |
| `security-headers` | Production security hardening (HSTS, CSP-ready, XFO)                       |

### Realtime Server (`packages/realtime`)

```mermaid
graph TB
    subgraph "packages/realtime/src"
        Entry["index.ts<br/>(createRealtimeServer, broadcast functions)"]
        AuthMW["middleware/auth.ts<br/>(JWT validation, room authorization)"]
        Stats["stats.ts<br/>(Real-time stats aggregation)"]
        Config["config/production.ts<br/>(Redis adapter, production Socket.io config)"]
        Lifecycle["lifecycle/graceful-shutdown.ts<br/>(SIGTERM/SIGINT handlers)"]
    end
```

**Broadcast Functions**: `broadcastCheckIn`, `broadcastRsvpUpdate`, `broadcastGoShow`, `broadcastStats`

### Database (`packages/db`)

| Component              | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `prisma/schema.prisma` | 12 models, 10 enums, multi-tenant schema          |
| `prisma/seed.ts`       | Demo data seeding (admin + scanner users)         |
| `src/client.ts`        | Prisma client factory with production pool config |

### Shared (`packages/shared`)

| Component             | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `types/validation.ts` | Zod schemas for all input validation               |
| `types/interfaces.ts` | TypeScript interfaces for domain entities          |
| `types/enums.ts`      | 11 enums (UserRole, GuestGroup, SectionType, etc.) |
| `types/responses.ts`  | API response type definitions                      |
| `types/errors.ts`     | ErrorCode enum for standardized error handling     |
| `utils/sanitize.ts`   | HTML sanitization for user-generated content       |

## Frontend Components

### Dashboard (`apps/dashboard`)

```mermaid
graph TB
    subgraph "App Router Pages"
        Login["login/page.tsx"]
        Home["(dashboard)/page.tsx"]
        Guests["guests/page.tsx"]
        CMS["cms/page.tsx"]
        CMSEdit["cms/edit/[sectionId]/page.tsx"]
        CMSPreview["cms/preview/page.tsx"]
        RSVP["rsvp/page.tsx"]
        SendInvitation["send-invitation/page.tsx"]
        AdminLayout["admin/layout.tsx"]
        AdminOverview["admin/overview/page.tsx"]
        AdminTenants["admin/tenants/page.tsx"]
        AdminUsers["admin/users/page.tsx"]
        AdminAudit["admin/audit-logs/page.tsx"]
    end

    subgraph "Key Components"
        Layout["layout/DashboardLayout + Sidebar + Header"]
        GuestTable["guests/GuestTable + Filters + AddModal (Creatable Group) + CSVImport + QRModal"]
        CMSComp["cms/SectionList + SectionEditorForm + MediaUpload"]
        Forms["cms/forms/ (15 section-specific forms — gallery supports multi-upload)"]
        UI["ui/ (shadcn: Button, Dialog, Table, Card, Select, etc. + DataTable)"]
    end

    subgraph "Hooks & Lib"
        UseSocket["hooks/use-socket.ts"]
        UseStats["hooks/use-realtime-stats.ts"]
        UseTable["hooks/use-table-state.ts"]
        UseGroups["hooks/queries → useGuestGroups (dynamic group names)"]
        AuthLib["lib/auth.ts"]
        APILib["lib/api.ts"]
        CMSLib["lib/cms.ts"]
        SocketLib["lib/socket.ts"]
    end
```

#### Guest Group Design Pattern

Guest groups are **event-scoped free-text strings** (not a DB enum). The dashboard uses an inline `CreatableGroupSelect` component inside `add-guest-modal.tsx` that:

- Loads existing groups via `useGuestGroups()` → `GET /guests/groups`
- Merges them with 4 preset defaults: `Keluarga`, `Teman`, `Rekan Kerja`, `VIP`
- Lets the couple type a new group name on-the-fly ("Buat grup: ...") without any prior setup
- `GuestFilters` sources its group options from the same `useGuestGroups()` hook
- `ManageGroupsModal` (`guests/components/manage-groups-modal.tsx`) allows bulk reassign of all guests from one group to another via `PATCH /guests/groups/reassign`. Accessible from the page header "Kelola Grup" button.
- All guest mutation hooks (`useCreateGuest`, `useUpdateGuest`, `useDeleteGuest`, `useBulkDeleteGuests`, `useImportGuests`, `useReassignGroup`) invalidate the `['guest-groups']` and `['rsvp-list']` React Query caches on success

### Invitation (Standalone Repo: `wedding-ecosystem-invitation`)

Aplikasi Invitation telah dipisahkan ke repository tersendiri. Aplikasi ini menggunakan Next.js 15, Tailwind v4 (CSS-first), dan Framer Motion, serta mengintegrasikan komponen UI kustom dari template `wedding-panji-gina` yang disesuaikan untuk berkomunikasi dengan API Fastify.

### Scanner (`apps/scanner`)

```mermaid
graph TB
    subgraph "App Router"
        ScanPage["page.tsx (main scanner)"]
        ManualPage["manual/page.tsx"]
    end

    subgraph "Components"
        QRScanner["QRScanner (html5-qrcode)"]
        VerResult["VerificationResultDisplay"]
        ManualCI["ManualCheckIn (search + check-in)"]
        GoShow["GoShowForm"]
        AuthProv["AuthProvider"]
        WSProv["WebSocketProvider"]
        PWAProv["PWAProvider"]
        EventSel["EventSelector"]
        Connectivity["ConnectivityIndicator"]
    end

    subgraph "Lib (Offline-First)"
        IndexedDB["indexed-db.ts (guest cache, queue)"]
        OfflineQueue["offline-queue.ts"]
        SyncManager["sync-manager.ts"]
        CheckinSvc["checkin-service.ts (online/offline verify)"]
        AuthClient["auth.ts (token management, device registration)"]
        WS["websocket.ts (useWebSocket hook)"]
        SWReg["service-worker-registration.ts"]
    end

    subgraph "Public"
        SW["sw.js (Service Worker)"]
    end
```

## Cross-Cutting Concerns

| Concern           | Implementation                                                 |
| ----------------- | -------------------------------------------------------------- |
| Authentication    | JWT tokens validated in API middleware and WebSocket handshake |
| Tenant Isolation  | Middleware injects `tenant_id` into all service calls          |
| Real-time Updates | Socket.io rooms scoped per event, broadcast on state changes   |
| Offline Support   | Scanner: IndexedDB queue + service worker + background sync    |
| Input Validation  | Zod schemas in `packages/shared`, enforced in API middleware   |
| Error Handling    | Standardized `ErrorCode` enum, typed error responses           |
| Caching           | Redis response cache with pattern-based invalidation           |
| Audit Logging     | Auto-logged for sensitive operations                           |
