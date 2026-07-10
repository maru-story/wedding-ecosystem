# Wedding Ecosystem

Platform multi-tenant untuk manajemen undangan pernikahan digital, menargetkan pasar Indonesia. Terdiri dari 2 aplikasi frontend dalam monorepo (dan 1 aplikasi invitation terpisah) yang terintegrasi dengan satu backend API.

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Spesifikasi Aplikasi](#spesifikasi-aplikasi)
- [Peran & Hak Akses](#peran--hak-akses)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Local Development](#setup-local-development)
- [Deploy Production](#deploy-production)
- [Cara Penggunaan](#cara-penggunaan)
- [Testing](#testing)
- [Struktur Project](#struktur-project)
- [Environment Variables](#environment-variables)

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Apps (Vercel)                    │
├───────────────────┬─────────────────────────────────────────┤
│   Dashboard       │   Scanner (PWA)                         │
│   (Next.js 16)    │   (Next.js 16)                          │
│   Port: 3000      │   Port: 3002                            │
└────────┬──────────┴──────────────────┬──────────────────────┘
         │                             │
         └───────────────┬─────────────┘
                         │ REST + WebSocket
┌────────────────────────────┴────────────────────────────────┐
│              Backend API + WebSocket (Fly.io)                 │
│                   Fastify 5 + Socket.io 4.8                  │
│                        Port: 4000                            │
├──────────────────────────────────────────────────────────────┤
│  Auth │ Guest │ RSVP │ Check-in │ CMS │ Scanner │ Realtime  │
└────────┬──────────────────────┬──────────────────────────────┘
         │                      │
    ┌────┴────┐           ┌─────┴─────┐
    │PostgreSQL│          │   Redis   │
    │(Supabase)│          │ (Upstash) │
    └──────────┘          └───────────┘
```

### Hubungan Lintas Repository (Cross-Repository)

Aplikasi frontend untuk tamu (**Invitation**) dikelola di repository terpisah untuk fleksibilitas desain dan independensi deployment:

- **Nama Repository**: `wedding-ecosystem-invitation`
- **Path Lokal**: `/home/mochrafi/wedding-project/wedding-ecosystem-invitation` (sejajar dengan monorepo ini di bawah folder induk `wedding-project`)
- **Teknologi**: Next.js 15, Tailwind v4 (CSS-first), Framer Motion, Radix UI.
- **Integrasi Backend**: Aplikasi Invitation berkomunikasi secara langsung ke Backend API monorepo ini (`packages/api` port `4000`) melalui pemanggilan HTTP REST API untuk mengambil data undangan, mengirim data RSVP, dan ucapan selamat/pesan dari tamu.
- **Environment Variable**: Memerlukan variabel `NEXT_PUBLIC_API_URL` pada sisi Invitation yang menunjuk ke endpoint API monorepo ini (misalnya `http://localhost:4000` pada saat local development).

---

## Spesifikasi Aplikasi

### 1. Dashboard (`apps/dashboard`)

Aplikasi web responsif untuk mengelola seluruh aspek undangan pernikahan.

| Fitur            | Deskripsi                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Manajemen Tamu   | CRUD tamu, bulk delete, import CSV (max 2000), filter per grup, kelola grup (reassign/hapus) |
| QR Code          | Generate otomatis per tamu, payload terenkripsi                                              |
| RSVP Tracking    | Monitor konfirmasi kehadiran real-time                                                       |
| Check-in Monitor | Dashboard real-time via WebSocket                                                            |
| CMS Undangan     | 15 section yang bisa diaktifkan/dinonaktifkan dan diurutkan                                  |
| Theme System     | 5 preset warna, kustomisasi hex                                                              |
| Notifikasi       | Kirim undangan batch (max 500)                                                               |
| Multi-tenant     | Data terisolasi per client                                                                   |

**User Roles**: Admin, Client, WO (Wedding Organizer)

### 2. Scanner (`apps/scanner`)

Progressive Web App (PWA) untuk verifikasi kehadiran tamu di venue.

| Fitur               | Deskripsi                                             |
| ------------------- | ----------------------------------------------------- |
| QR Scan             | Verifikasi < 2 detik, kamera real-time                |
| Manual Check-in     | Cari nama tamu, check-in tanpa QR                     |
| Go-Show             | Daftarkan tamu walk-in di hari-H                      |
| Offline-first       | Service worker + IndexedDB, sync otomatis saat online |
| Duplicate Detection | Scan kedua diperbolehkan dan menambah jumlah scan     |
| Real-time Sync      | WebSocket untuk koordinasi antar scanner device       |
| Max 2 Device        | Maksimal 2 scanner per event (Lane 1 & Lane 2)        |
| Auth Flow           | Login → Pilih Event → Register Device → Scan          |

**User Roles**: Scanner Operator, Client, Admin

### 3. Backend API (`packages/api`)

Single Fastify server handling REST API and WebSocket. Uses a 4-layer architecture: Plugins → Routes → Middleware → Services → Repositories.

| Fitur             | Deskripsi                                                     |
| ----------------- | ------------------------------------------------------------- |
| Authentication    | JWT via `@wedding/shared` utility, account lockout (Req 2.4)  |
| Tenant Isolation  | Strict filtering by `tenant_id` at service & repository level |
| Rate Limiting     | 100 req/menit per tenant (Redis-backed with in-memory fallbk) |
| CORS              | Per-app origin validation via modular plugin                  |
| WebSocket Auth    | Shared JWT logic, room-based authorization (Assigned Event)   |
| Health Check      | Deep monitoring of PostgreSQL, Redis, WebSocket health        |
| Graceful Shutdown | Managed lifecycle plugin for clean SIGTERM handling           |
| Audit Logger      | Automated logging for high-value operations                   |
| Response Cache    | Pattern-based Redis caching with auto-invalidation            |
| Security Headers  | Production-ready HSTS, X-Frame-Options, CSP                   |

### 4. Shared Package (`packages/shared`)

| Fitur            | Deskripsi                                           |
| ---------------- | --------------------------------------------------- |
| Zod Schemas      | Centralized validation for frontend & backend       |
| TypeScript Types | Shared interfaces, enums, and RBAC roles            |
| Auth Utility     | Type-safe JWT verification (Single Source of Truth) |
| Sanitization     | HTML sanitize for user-generated content            |

### 5. Database (`packages/db`)

| Fitur           | Deskripsi                                      |
| --------------- | ---------------------------------------------- |
| Prisma ORM      | Schema-first, type-safe queries (v7.7)         |
| Unified Config  | Centralized pooling & SSL logic for all apps   |
| Connection Pool | CPU-optimized formula: (cores × 2) + 1, min 10 |
| SSL             | verify-full enforced for production safety     |
| Multi-tenant    | RLS-ready with `tenant_id` on all user-data    |

### 6. Realtime (`packages/realtime`)

| Fitur              | Deskripsi                                                    |
| ------------------ | ------------------------------------------------------------ |
| Socket.io          | Room-based isolation per event room                          |
| Events             | guest_checked_in, rsvp_updated, go_show_added, stats_updated |
| Shared Auth        | Standardized JWT verification via `@wedding/shared`          |
| Room Authorization | Tenant-scoped access check for event rooms                   |
| Redis Adapter      | Cluster-ready via shared pub/sub                             |

## Peran & Hak Akses (Roles & Permissions)

Sistem ini menggunakan **Role-Based Access Control (RBAC)** untuk membatasi akses fitur dan data berdasarkan peran masing-masing pengguna. Dilengkapi dengan isolasi _multi-tenant_ di tingkat basis data, setiap pengguna (selain Admin Global) hanya dapat mengakses data yang berhak mereka lihat.

Berikut adalah spesifikasi lengkap hak akses untuk masing-masing peran (_role_):

### 1. Admin (Global Administrator)

- **Deskripsi**: Administrator platform yang memiliki kendali penuh secara global terhadap seluruh ekosistem aplikasi.
- **Lingkup Kerja (Scope)**: Global (Lintas seluruh tenant dan seluruh data sistem).
- **Dapat Melakukan (Allowed)**:
  - Melakukan pendaftaran, edit, dan penghapusan tenant baru (_Multi-Tenant Management_).
  - Melakukan CRUD penuh terhadap seluruh resource database (User, Tenant, Event, Tamu, dsb.).
  - Mengakses dashboard global dan memantau status kesehatan sistem secara menyeluruh.
  - Mengonfigurasi pengaturan sistem global dan mengelola lisensi client.
- **Tidak Dapat Melakukan (Restricted)**:
  - — (Tidak ada batasan hak akses / Super User).

### 2. Client (Wedding Owner / Penyelenggara)

- **Deskripsi**: Akun pemilik/penyelenggara pernikahan yang menyewa tenant pada platform.
- **Lingkup Kerja (Scope)**: Tenant Milik Sendiri (Hanya dapat mengakses data dalam tenant mereka sendiri).
- **Dapat Melakukan (Allowed)**:
  - Membuat, memperbarui, dan menghapus event pernikahan di dalam tenant milik sendiri.
  - Mengelola daftar tamu secara penuh (CRUD tamu, bulk delete, generate otomatis QR Code, ekspor data, dan import bulk via CSV).
  - Mengonfigurasi CMS Undangan (mengaktifkan/menonaktifkan dan menyusun ulang urutan 15 section undangan).
  - Memilih preset warna tema undangan dan melakukan kustomisasi warna hex.
  - Mengirimkan broadcast notifikasi undangan secara massal (batch max 500 tamu).
  - Memantau real-time RSVP (kehadiran & pax) dan melihat statistik check-in tamu di hari-H secara real-time via WebSocket.
- **Tidak Dapat Melakukan (Restricted)**:
  - Mengakses, melihat, atau memodifikasi data dari tenant/client lain (_strict multi-tenant isolation_).
  - Membuat tenant baru atau mengelola akun Admin lainnya.
  - Mendaftarkan scanner device melebihi batas kuota (maksimal 2 device aktif per event).

### 3. WO (Wedding Organizer)

- **Deskripsi**: Peran operasional pihak ketiga yang ditugaskan oleh Client untuk membantu jalannya acara pernikahan.
- **Lingkup Kerja (Scope)**: Event yang Ditugaskan (_Assigned Events_).
- **Dapat Melakukan (Allowed)**:
  - Mengelola daftar tamu untuk event yang ditugaskan kepadanya (tambah tamu, update info RSVP, dsb.).
  - Memantau jalannya check-in tamu secara real-time di hari-H melalui dashboard WO.
  - Melihat statistik kehadiran, ringkasan RSVP, dan laporan Check-in tamu.
- **Tidak Dapat Melakukan (Restricted)**:
  - Membuat event pernikahan baru atau menghapus event yang sudah ada.
  - Mengonfigurasi CMS Undangan atau merubah pengaturan tema/desain undangan.
  - Mengirimkan broadcast notifikasi undangan massal.
  - Mengakses data event atau data tamu dari client/tenant lain yang tidak ditugaskan kepadanya.

### 4. Scanner Operator (Petugas Venue)

- **Deskripsi**: Operator di lokasi acara (hari-H) yang bertugas melakukan verifikasi kehadiran fisik tamu di pintu masuk.
- **Lingkup Kerja (Scope)**: Satu Event Spesifik pada Hari-H (_Assigned Active Event_).
- **Dapat Melakukan (Allowed)**:
  - Melakukan verifikasi QR Code tamu menggunakan kamera device (respon cepat < 2 detik).
  - Melakukan check-in manual dengan mencari nama tamu (minimal 3 karakter) jika tamu tidak membawa QR Code.
  - Mendaftarkan tamu dadakan (_Go-Show_) langsung di lokasi acara (hari-H) tanpa generate QR Code, dan langsung tercatat sebagai checked-in.
  - Menyimpan data scan secara lokal di IndexedDB saat offline, dan melakukan sinkronisasi otomatis (_automatic sync_) ke server ketika koneksi pulih (dengan aturan _Server Wins_ jika terjadi konflik).
  - Mendaftarkan device scanner (maksimal 2 device aktif per event untuk menghindari antrean ganda di gerbang yang sama).
- **Tidak Dapat Melakukan (Restricted)**:
  - Mengubah informasi tamu yang sudah terdaftar sebelumnya (selain mencatat status check-in).
  - Menghapus tamu dari daftar.
  - Mengedit konfigurasi CMS Undangan, detail acara, maupun tema undangan.
  - Melakukan broadcast pengiriman undangan.

### 5. Tamu (Guest)

- **Deskripsi**: Penerima undangan digital pernikahan.
- **Lingkup Kerja (Scope)**: Halaman Undangan Publik yang Dipersonalisasi via URL (`/{event-slug}?to={guest-slug}`).
- **Dapat Melakukan (Allowed)**:
  - Mengakses halaman undangan digital yang menampilkan sapaan nama mereka secara personal di bagian cover.
  - Mengisi formulir RSVP (konfirmasi kehadiran pada Akad, Resepsi, Keduanya, atau Tidak Hadir beserta jumlah pax).
  - Mengirimkan ucapan selamat, doa restu, atau pesan (_wishes/messages_) kepada kedua mempelai.
  - Melihat 15 section informasi pernikahan (kisah cinta, profil mempelai wanita, profil mempelai pria, galeri foto, video prewedding, koordinat peta venue, hitung mundur acara, dan info amplop digital/kado).
- **Tidak Dapat Melakukan (Restricted)**:
  - Mengakses halaman dashboard admin ataupun dashboard WO (memerlukan autentikasi JWT).
  - Mengakses aplikasi scanner check-in tamu.
  - Melihat data tamu lain atau pesan yang bersifat privat.

---

## Tech Stack

| Layer              | Technology                    | Version   |
| ------------------ | ----------------------------- | --------- |
| Frontend Framework | Next.js                       | 16.2      |
| UI Library         | React                         | 19.2      |
| Styling            | TailwindCSS                   | 4.3       |
| Components         | shadcn/ui                     | latest    |
| Animation          | Motion (Framer Motion)        | 12.17+    |
| QR Scanning        | html5-qrcode                  | 2.3       |
| Forms              | React Hook Form               | 7.75      |
| Data Fetching      | @tanstack/react-query         | 5.89+     |
| Backend            | Fastify                       | 5.8       |
| ORM                | Prisma                        | 7.7       |
| WebSocket          | Socket.io                     | 4.8       |
| Cache/PubSub       | Redis (ioredis)               | 5.10      |
| Auth               | JWT + bcrypt                  | 9.0 / 6.0 |
| Validation         | Zod                           | 3.25      |
| Image Processing   | Sharp                         | 0.34      |
| Storage            | Cloudflare R2 (S3-compatible) | —         |
| Testing            | Vitest + fast-check           | 3.2 / 4.8 |
| Language           | TypeScript                    | 5.9       |
| Monorepo           | npm workspaces + Turborepo    | 2.4       |

---

## Prerequisites

- **Node.js** 20+ (disarankan 22 LTS)
- **PostgreSQL** 14+ (local atau Supabase)
- **Redis** 6+ (local atau Upstash)
- **npm** 10+

---

## Setup Local Development

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/wedding-ecosystem.git
cd wedding-ecosystem
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` dan isi minimal:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wedding_digital_saas?schema=public"
```

Buat juga `packages/db/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wedding_digital_saas?schema=public"
```

### 3. Setup Database & Redis (Docker Compose)

Untuk kemudahan development, Anda dapat menjalankan database PostgreSQL dan cache Redis secara lokal menggunakan Docker Compose:

```bash
# Jalankan PostgreSQL dan Redis di background
docker compose up -d
```

Ini akan otomatis membuat database `wedding` pada port `5432` dengan user/password `postgres/postgrespassword`. Sesuaikan connection string di file `.env` Anda:
`DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/wedding?schema=public"`

Jika Anda ingin menggunakan database PostgreSQL lokal yang diinstal secara manual tanpa Docker:

```bash
# Buat database manual
sudo -u postgres psql -c "CREATE DATABASE wedding_digital_saas;"
```

Setelah database berjalan, jalankan migrasi dan generate Prisma client:

```bash
# Jalankan migrasi
npx prisma migrate dev --schema=packages/db/prisma/schema.prisma

# Generate Prisma client
npx prisma generate --schema=packages/db/prisma/schema.prisma
```

### 4. Start Redis (opsional untuk development)

Jika Anda tidak menggunakan Docker Compose, Anda bisa menjalankan Redis lokal secara manual. Redis tidak wajib untuk development — sistem akan graceful degrade tanpa Redis (cache bypass, rate limit in-memory).

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo service redis-server start

# Verify
redis-cli ping  # Should return PONG
```

Jika menggunakan Redis, tambahkan ke `.env`:

```env
UPSTASH_REDIS_CACHE_URL=redis://localhost:6379
```

### 5. Jalankan Semua Aplikasi

```bash
# Dari root — jalankan semua sekaligus via Turborepo
npm run dev
```

Atau jalankan terpisah:

```bash
# Terminal 1: Backend API (http://localhost:4000)
npx turbo dev --filter=@wedding/api

# Terminal 2: Dashboard (http://localhost:3000)
npx turbo dev --filter=@wedding/dashboard

# Terminal 3: Scanner (http://localhost:3002)
npx turbo dev --filter=@wedding/scanner
```

### 6. Seed Data (Opsional)

Untuk membuat user demo:

```bash
cd packages/db
npx tsx prisma/seed.ts
```

Kredensial demo:

- **Admin**: `admin@demo.com` / `password123`
- **Scanner**: `scanner@demo.com` / `password123`

---

## Deploy Production

### Infrastruktur

| Service                 | Platform      | Keterangan                            |
| ----------------------- | ------------- | ------------------------------------- |
| Frontend (2 apps)       | Vercel        | Auto-deploy dari branch `main`        |
| Backend API + WebSocket | Fly.io        | Single service, native rolling update |
| Database                | Supabase      | Managed PostgreSQL + PgBouncer        |
| Cache/PubSub            | Upstash       | Serverless Redis                      |
| CDN/Storage             | Cloudflare R2 | Media files + CDN                     |

### Alur Deploy

```
Push ke main
    │
    ├── CI (GitHub Actions)
    │   ├── Install dependencies
    │   ├── Run tests (vitest)
    │   ├── Security audit (npm audit)
    │   ├── Static analysis (ESLint + TypeScript)
    │   └── Secret scanning
    │
    ├── Frontend Deploy (jika apps/ berubah)
    │   ├── Detect changed apps (git diff)
    │   ├── Build via Vercel CLI
    │   ├── Deploy to production
    │   └── Smoke test (HTTP status + asset accessibility)
    │
    └── Backend Deploy (jika packages/ berubah)
        ├── Run database migrations (prisma migrate deploy)
        ├── Deploy ke inactive environment (blue/green)
        ├── Health check (3 menit, 3 consecutive successes)
        ├── Swap traffic ke new environment
        └── Auto-rollback jika health check gagal
```

### Setup Fly.io

1. Pastikan Anda sudah login ke CLI: `fly auth login`
2. Jalankan perintah deploy pertama kali menggunakan file konfigurasi:
   - Staging: `fly deploy --config fly.staging.toml`
   - Production: `fly deploy --config fly.toml`
3. Set environment variables / secrets di Fly.io menggunakan:
   `fly secrets set KEY=VALUE`

### Setup Vercel

1. Import repo ke Vercel (2 projects, satu per app)
2. Set root directory per project: `apps/dashboard`, `apps/scanner`
3. Set environment variables per project:

```env
NEXT_PUBLIC_API_URL=https://api.maruplanner.my.id
NEXT_PUBLIC_WS_URL=https://api.maruplanner.my.id
NEXT_PUBLIC_INVITATION_URL=https://maruplanner.my.id
NEXT_PUBLIC_CDN_URL=https://cdn.maruplanner.my.id
```

Setiap app sudah punya `vercel.json` dengan build command dan security headers.

### Setup GitHub Secrets

```
FLY_API_TOKEN
VERCEL_ORG_ID
VERCEL_TOKEN
VERCEL_PROJECT_ID_DASHBOARD
VERCEL_PROJECT_ID_SCANNER
DATABASE_URL_TEST
CLOUDFLARE_ZONE_ID (opsional)
CLOUDFLARE_API_TOKEN (opsional)
SLACK_WEBHOOK_URL (opsional)
```

### Database Migration (Production)

```bash
# Dari CI/CD (otomatis via deploy-backend.yml)
cd packages/db
npx prisma migrate deploy
```

---

## Cara Penggunaan

### Dashboard — Untuk Client & WO

1. **Login** di `https://dashboard-url/login`
2. **Kelola Tamu**:
   - Tambah tamu satu-satu atau import CSV
   - QR code otomatis di-generate
   - Filter berdasarkan grup (Keluarga, Teman, Rekan Kerja, VIP, atau grup kustom)
   - Kelola Grup: pindahkan semua tamu dari satu grup ke grup lain (grup kosong otomatis hilang)
3. **Atur Undangan (CMS)**:
   - Aktifkan/nonaktifkan section
   - Drag & drop untuk mengubah urutan
   - Edit konten per section (teks, gambar, video)
4. **Pilih Theme**:
   - 5 preset warna tersedia
   - Kustomisasi warna hex
5. **Kirim Undangan**:
   - Kirim via WhatsApp/SMS (link personalized)
   - Track status pengiriman (Belum Dikirim / Terkirim / Gagal)
6. **Monitor RSVP**:
   - Lihat siapa yang sudah konfirmasi
   - Filter: Akad, Resepsi, Keduanya, Tidak Hadir
7. **Monitor Check-in (Hari-H)**:
   - Real-time dashboard via WebSocket
   - Lihat total tamu hadir, Go-Show, statistik per grup

### Scanner — Untuk Operator di Venue

1. **Login**: Masuk dengan akun scanner operator
2. **Pilih Event**: Pilih event yang sedang berlangsung
3. **Register Device**: Otomatis terdaftar sebagai scanner device (max 2 per event)
4. **Scan QR**:
   - Arahkan kamera ke QR code tamu
   - Hasil muncul dalam < 2 detik:
     - 🟢 GREEN: Check-in/scan berhasil (nama + grup + jumlah scan ke-N)
     - 🔴 RED: QR tidak valid
5. **Manual Check-in**:
   - Cari nama tamu (min 3 karakter)
   - Tap "Check-in" pada hasil pencarian
6. **Go-Show**:
   - Jika tamu tidak ditemukan, tap "Tambah sebagai Go-Show"
   - Isi nama → langsung tercatat sebagai checked-in
7. **Mode Offline**:
   - Scanner tetap berfungsi tanpa internet
   - Data disimpan di IndexedDB
   - Sync otomatis saat koneksi kembali (dalam 30 detik)
   - Conflict resolution: server timestamp wins
8. **Ganti Event / Logout**:
   - Tombol di header untuk switch event atau keluar

---

## Testing

```bash
# Semua tests dari root
npm run test

# Playwright E2E integration tests (packages/api)
npm run test:e2e --workspace=packages/api

# Per package
npx turbo test --filter=@wedding/api        # ~924 tests
npx turbo test --filter=@wedding/shared      # ~63 tests
npx turbo test --filter=@wedding/realtime    # ~87 tests
npx turbo test --filter=@wedding/dashboard   # ~81 tests
npx turbo test --filter=@wedding/scanner     # ~43 tests
```

**Total: ~1218 tests** (unit + integration + property-based)

Property-based tests (fast-check) mencakup:

- QR validation edge cases
- RSVP processing invariants
- Duplicate detection guarantees
- Tenant isolation properties
- Offline sync completeness
- Room isolation (WebSocket)

---

## Struktur Project

```
wedding-ecosystem/
├── apps/
│   ├── dashboard/          # Client & WO Dashboard (Next.js 16)
│   └── scanner/            # Scanner PWA (Next.js 16)
├── packages/
│   ├── api/                # Backend API (Fastify 5)
│   │   ├── src/
│   │   │   ├── config/     # Grouped: database/, logger/, redis/, etc.
│   │   │   ├── middleware/ # Grouped: cors/, rbac/, tenant-isolation/, etc.
│   │   │   ├── plugins/    # Grouped: audit-logger/, rate-limiter/, etc.
│   │   │   ├── routes/     # Grouped: guests/, health/, etc.
│   │   │   ├── services/   # Grouped: auth/, guest/, checkin/, etc.
│   │   │   └── repositories/ # Type-safe data access layer
│   ├── db/                 # Database (Prisma 7.7 + PgAdapter)
│   │   ├── src/            # Unified client factory & pool config
│   │   └── prisma/         # Schema & Migrations
│   ├── shared/             # Shared types & utilities
│   │   └── src/
│   │       ├── types/      # auth/, enums/, interfaces/
│   │       └── utils/      # auth/, sanitize/
│   └── realtime/           # WebSocket server (Socket.io 4.8)
│       └── src/
│           ├── config/     # production/
│           ├── middleware/ # auth/
│           ├── lifecycle/  # graceful-shutdown/
│           └── stats/      # stats.ts & stats.test.ts
```

---

## Environment Variables

### Backend (Fly.io)

| Variable                  | Required | Default                          | Deskripsi                                 |
| ------------------------- | -------- | -------------------------------- | ----------------------------------------- |
| `NODE_ENV`                | Ya       | `development`                    | Environment mode                          |
| `PORT`                    | Tidak    | `4000`                           | Server port                               |
| `DATABASE_URL`            | Ya       | —                                | PostgreSQL connection (direct, port 5432) |
| `DATABASE_POOLED_URL`     | Tidak    | fallback ke DATABASE_URL         | PgBouncer connection (port 6543)          |
| `UPSTASH_REDIS_CACHE_URL` | Tidak    | —                                | Redis URL (graceful degrade jika kosong)  |
| `JWT_SECRET`              | Ya       | `wedding-dev-secret-key`         | JWT signing secret                        |
| `REFRESH_SECRET`          | Ya       | `wedding-dev-refresh-secret-key` | Refresh token secret                      |
| `DASHBOARD_ORIGIN`        | Ya       | `http://localhost:3000`          | Dashboard URL untuk CORS                  |
| `INVITATION_ORIGIN`       | Ya       | `http://localhost:3001`          | Invitation URL untuk CORS                 |
| `SCANNER_ORIGIN`          | Ya       | `http://localhost:3002`          | Scanner URL untuk CORS                    |
| `R2_ACCOUNT_ID`           | Tidak    | —                                | Cloudflare R2 account                     |
| `R2_ACCESS_KEY_ID`        | Tidak    | —                                | R2 access key                             |
| `R2_SECRET_ACCESS_KEY`    | Tidak    | —                                | R2 secret key                             |
| `R2_BUCKET_NAME`          | Tidak    | —                                | R2 bucket name                            |
| `R2_PUBLIC_URL`           | Tidak    | —                                | CDN URL untuk media                       |

### Frontend (Vercel)

| Variable              | Required | Default                 | Deskripsi                       |
| --------------------- | -------- | ----------------------- | ------------------------------- |
| `NEXT_PUBLIC_API_URL` | Ya       | `http://localhost:4000` | Backend API URL                 |
| `NEXT_PUBLIC_WS_URL`  | Ya       | `http://localhost:4000` | WebSocket URL (sama dengan API) |
| `NEXT_PUBLIC_CDN_URL` | Tidak    | —                       | CDN URL untuk media assets      |

---

## Performance Targets

| Metric                      | Target    |
| --------------------------- | --------- |
| QR scan verification        | < 2 detik |
| Invitation FCP (mobile 3G)  | < 3 detik |
| WebSocket broadcast latency | < 500ms   |
| Duplicate detection         | < 200ms   |
| DB lookup (QR/slug)         | < 100ms   |
| Guest capacity per event    | max 500   |

---

## Scale & Constraints

Deployment saat ini ditargetkan untuk **1 event aktif, max 500 tamu**:

- Single API server instance (no clustering)
- Single Redis instance (cache + pub/sub shared)
- Single WebSocket instance (~50 peak concurrent)
- Database pool: 10 connections

**Kapan perlu scale**: Multiple concurrent events, 1000+ tamu, atau p95 latency melebihi target.

---

## License

Private — All rights reserved.
