# Database Migrations

## Setup

Migrations are managed by Prisma Migrate. To create and apply migrations, you need a running PostgreSQL database.

### Prerequisites

1. Set `DATABASE_URL` in `packages/db/.env`:

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wedding_digital_saas?schema=public"
   ```

2. Ensure PostgreSQL is running and accessible.

### Commands

```bash
# Create a new migration (development)
npm run migrate:dev

# Apply migrations (production)
npm run migrate:deploy

# Generate Prisma client (no DB needed)
npm run generate

# Reset database (destructive - development only)
npx prisma migrate reset
```

### Initial Migration

To create the initial migration when a database is available:

```bash
cd packages/db
npx prisma migrate dev --name init
```

This will create the migration SQL file based on the schema defined in `prisma/schema.prisma`.

## Schema Overview

The database uses PostgreSQL with the following tables:

- `tenants` - Multi-tenant business clients
- `users` - Platform users with role-based access
- `events` - Wedding events owned by tenants
- `event_configs` - Event configuration (theme, sections)
- `guests` - Guest records (directly tenant-scoped for performance)
- `qr_codes` - QR codes for guest check-in
- `rsvps` - RSVP submissions
- `check_ins` - Check-in records
- `invitation_sections` - CMS sections for invitations
- `scanner_devices` - Scanner devices per event
- `messages` - Guest messages/wishes

### Key Indexes

- `qr_codes.qr_payload` (unique + index) - Fast QR lookup < 100ms
- `guests.slug` - Fast guest lookup by slug
- `events.slug` (unique) - Fast event lookup by slug
- `guests.tenant_id` - Tenant isolation queries
- `users.tenant_id` - Tenant isolation queries
- `events.tenant_id` - Tenant isolation queries

## Rollback Strategy

Since Prisma Migrate does not support automatic down migrations, database rollbacks must be performed manually via SQL or using the `prisma migrate resolve` command in production.

### General Rollback Steps

1. **Revert the Code**: Revert the code deployment to the previous stable release commit.
2. **Revert Schema Changes**: Execute the manual down SQL script in the PostgreSQL console.
3. **Mark Migration as Rolled Back**: Use the Prisma CLI to resolve the migration status:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

### Manual Rollback Scripts (Recent Migrations)

#### 1. `20260603135000_add_username_to_user`
To roll back the username addition:
```sql
DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
```

#### 2. `20260602044410_add_scanner_device_index_and_event_date_timestamptz`
To roll back event date type conversions and the check-in scanner device index:
```sql
DROP INDEX IF EXISTS "check_ins_scanner_device_id_idx";
ALTER TABLE "events" ALTER COLUMN "event_date" SET DATA TYPE TIMESTAMP;
```

#### 3. `20260601070041_add_checkin_scan_count`
To roll back the check-in scan count:
```sql
ALTER TABLE "check_ins" DROP COLUMN IF EXISTS "scan_count";
```

#### 4. `20260530163100_add_user_is_active`
To roll back user active status column:
```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active";
```
