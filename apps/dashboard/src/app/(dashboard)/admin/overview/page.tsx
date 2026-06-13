'use client';

import { useAdminStats, useSystemHealth } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DonutChart } from '@/app/(dashboard)/components/dashboard-charts';
import {
  Building2,
  Users,
  QrCode,
  UserCheck,
  RefreshCw,
  Activity,
  Server,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ClipboardList,
  MessageSquare,
  BadgeCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { data: statsResponse, isLoading, error, refetch, isFetching } = useAdminStats();
  const stats = statsResponse?.data;

  // Query live health check status
  const { data: health, isLoading: isLoadingHealth, refetch: refetchHealth } = useSystemHealth();

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchHealth()]);
  };

  // Format error message
  let errorMessage = '';
  if (error) {
    if (error instanceof ApiError) {
      const errData = error.data as { error?: { message?: string } };
      errorMessage = errData.error?.message || 'Gagal memuat data statistik global';
    } else {
      errorMessage = 'Terjadi kesalahan koneksi ke server';
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="bg-muted h-8 w-64 animate-pulse rounded" />
          <div className="bg-muted mt-2 h-4 w-96 animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border-border/40 h-32 animate-pulse rounded-xl border p-6 shadow-sm"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-card border-border/40 h-80 animate-pulse rounded-xl border shadow-sm" />
          <div className="bg-card border-border/40 h-80 animate-pulse rounded-xl border shadow-sm" />
        </div>
      </div>
    );
  }

  // Visual subscription breakdown mapping
  const planChartData = stats
    ? [
        { label: 'Basic', value: stats.tenants_by_plan.basic, color: 'var(--color-chart-1)' },
        { label: 'Premium', value: stats.tenants_by_plan.premium, color: 'var(--color-chart-2)' },
        { label: 'Enterprise', value: stats.tenants_by_plan.enterprise, color: 'var(--color-chart-4)' },
      ]
    : [];

  // Visual check-in breakdown mapping
  const checkinChartData = stats
    ? [
        { label: 'QR Scan', value: stats.checkin_methods.qr_scan, color: 'var(--color-chart-1)' },
        { label: 'Manual', value: stats.checkin_methods.manual, color: 'var(--color-chart-2)' },
        { label: 'Go Show', value: stats.checkin_methods.go_show, color: 'var(--color-chart-4)' },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-foreground text-3xl font-bold tracking-tight">
            Statistik Global
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ringkasan metrik performa platform digital secara real-time.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isFetching}
          variant="outline"
          className="border-border/60 hover:bg-muted/20 flex items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-medium transition-all"
        >
          <RefreshCw
            className={`text-muted-foreground h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          Perbarui Data
        </Button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-xl border p-4 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="destructive"
            className="rounded-lg px-3 py-1.5"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tenants Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Tenant</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_tenants}
                    </p>
                  </div>
                  <div className="bg-primary/15 text-foreground rounded-2xl p-3.5">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{stats.tenant_status.active} Aktif · {stats.tenant_status.inactive} Nonaktif</span>
                </div>
              </CardContent>
            </Card>

            {/* Users Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Pengguna</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_users}
                    </p>
                  </div>
                  <div className="bg-accent/40 text-foreground rounded-2xl p-3.5">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Admin, Client, dan WO terdaftar</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Events Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Event</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_events}
                    </p>
                  </div>
                  <div className="bg-info/15 text-info rounded-2xl p-3.5">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{stats.event_status.published} Published · {stats.event_status.draft} Draft</span>
                </div>
              </CardContent>
            </Card>

            {/* Global Guests Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Tamu</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_guests}
                    </p>
                  </div>
                  <div className="bg-success/15 text-success rounded-2xl p-3.5">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-success mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Rata-rata: {stats.avg_guests_per_event} tamu / event</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Scanners Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Scanner Aktif</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.active_scanner_devices}
                    </p>
                  </div>
                  <div className="bg-copper/15 text-ring rounded-2xl p-3.5">
                    <QrCode className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-ring mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  <span>Perangkat scan QR aktif saat ini</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Check-ins Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Check-In</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_checkins}
                    </p>
                  </div>
                  <div className="bg-primary/15 text-foreground rounded-2xl p-3.5">
                    <BadgeCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Kehadiran rata-rata: {stats.avg_attendance_rate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Total RSVP Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total RSVP</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_rsvps}
                    </p>
                  </div>
                  <div className="bg-accent/40 text-foreground rounded-2xl p-3.5">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Respon kehadiran terkirim</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Wishes Card */}
            <Card className="border-border/40 bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Ucapan</p>
                    <p className="text-foreground text-3xl font-extrabold tracking-tight">
                      {stats.total_wishes}
                    </p>
                  </div>
                  <div className="bg-success/15 text-success rounded-2xl p-3.5">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-success mt-4 flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Doa & ucapan dari undangan</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown & Analysis Charts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Tenants by Subscription Plan Chart */}
            <Card className="border-border/40 bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-lg font-bold">
                  Adopsi Paket Subscription
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Distribusi tenant terdaftar berdasarkan paket langganan.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center justify-around gap-6 sm:flex-row">
                  <DonutChart data={planChartData} centerSublabel="TENANTS" />
                  <div className="space-y-3.5">
                    {planChartData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-sm">
                          <span className="text-muted-foreground font-medium">{item.label}:</span>{' '}
                          <span className="text-foreground font-bold">{item.value} tenant</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-in Method Distribution Chart */}
            <Card className="border-border/40 bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-lg font-bold">
                  Metode Check-In Terpopuler
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Persentase metode yang digunakan tamu saat check-in di lokasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center justify-around gap-6 sm:flex-row">
                  <DonutChart data={checkinChartData} centerSublabel="SCANS" />
                  <div className="space-y-3.5">
                    {checkinChartData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-sm">
                          <span className="text-muted-foreground font-medium">{item.label}:</span>{' '}
                          <span className="text-foreground font-bold">{item.value} kali</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integrated Platform Infrastructure Health Status */}
          <Card className="border-border/40 bg-card shadow-sm">
            <CardHeader className="border-border/40 border-b pb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-info/15 text-info rounded-lg p-2">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-lg font-bold">
                      Status Kesehatan Infrastruktur (LIVE)
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Indikator kesehatan terintegrasi langsung dengan status server backend.
                    </CardDescription>
                  </div>
                </div>
                {health && (
                  <div className="flex items-center gap-2 self-start rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {health.status === 'healthy' ? (
                      <Wifi className="text-success h-3.5 w-3.5" />
                    ) : (
                      <WifiOff className="text-destructive h-3.5 w-3.5" />
                    )}
                    <span>
                      Sistem:{' '}
                      {health.status === 'healthy'
                        ? 'Optimal'
                        : health.status === 'degraded'
                        ? 'Degradasi'
                        : 'Bermasalah'}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Postgres Card */}
                <div className="bg-muted/20 border-border/40 flex items-start gap-4 rounded-xl border p-4">
                  <div
                    className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                      isLoadingHealth
                        ? 'bg-muted animate-pulse'
                        : health?.dependencies.postgresql.status === 'up'
                        ? 'bg-success animate-pulse'
                        : 'bg-destructive'
                    }`}
                  />
                  <div>
                    <h4 className="text-foreground text-sm font-bold">Database Server</h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      PostgreSQL Connection & Query raw
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isLoadingHealth
                          ? 'bg-muted text-muted-foreground'
                          : health?.dependencies.postgresql.status === 'up'
                          ? 'bg-success/15 text-success'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {isLoadingHealth
                        ? 'Mengecek...'
                        : health?.dependencies.postgresql.status === 'up'
                        ? `Normal (${health.dependencies.postgresql.latency}ms)`
                        : 'Down / Bermasalah'}
                    </span>
                  </div>
                </div>

                {/* Redis Card */}
                <div className="bg-muted/20 border-border/40 flex items-start gap-4 rounded-xl border p-4">
                  <div
                    className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                      isLoadingHealth
                        ? 'bg-muted animate-pulse'
                        : health?.dependencies.redis_cache.status === 'up'
                        ? 'bg-success animate-pulse'
                        : 'bg-destructive'
                    }`}
                  />
                  <div>
                    <h4 className="text-foreground text-sm font-bold">Redis Cache Storage</h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Upstash primary cache connection
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isLoadingHealth
                          ? 'bg-muted text-muted-foreground'
                          : health?.dependencies.redis_cache.status === 'up'
                          ? 'bg-success/15 text-success'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {isLoadingHealth
                        ? 'Mengecek...'
                        : health?.dependencies.redis_cache.status === 'up'
                        ? `Normal (${health.dependencies.redis_cache.latency}ms)`
                        : 'Down / Bermasalah'}
                    </span>
                  </div>
                </div>

                {/* WebSocket Card */}
                <div className="bg-muted/20 border-border/40 flex items-start gap-4 rounded-xl border p-4">
                  <div
                    className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                      isLoadingHealth
                        ? 'bg-muted animate-pulse'
                        : health?.dependencies.websocket.status === 'up'
                        ? 'bg-success animate-pulse'
                        : 'bg-destructive'
                    }`}
                  />
                  <div>
                    <h4 className="text-foreground text-sm font-bold">Socket.io WebSocket</h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Real-time push gateway server
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isLoadingHealth
                          ? 'bg-muted text-muted-foreground'
                          : health?.dependencies.websocket.status === 'up'
                          ? 'bg-success/15 text-success'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {isLoadingHealth
                        ? 'Mengecek...'
                        : health?.dependencies.websocket.status === 'up'
                        ? `Aktif (${health.dependencies.websocket.latency}ms)`
                        : 'Down / Bermasalah'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
