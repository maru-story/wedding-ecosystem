'use client';

import { useAdminStats } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  QrCode, 
  UserCheck, 
  RefreshCw, 
  Activity, 
  Server, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { data: statsResponse, isLoading, error, refetch, isFetching } = useAdminStats();
  const stats = statsResponse?.data;

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
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-card p-6 shadow-sm border border-border/40" />
          ))}
        </div>

        <div className="h-64 animate-pulse rounded-xl bg-card shadow-sm border border-border/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Statistik Global
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan metrik performa platform digital secara real-time.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="flex items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-medium border-border/60 transition-all hover:bg-muted/20"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          Perbarui Data
        </Button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-semibold"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button 
            onClick={() => refetch()} 
            size="sm" 
            variant="destructive"
            className="rounded-lg px-3 py-1.5"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Stat Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tenants Card */}
            <Card className="relative overflow-hidden border-border/40 hover:shadow-md transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Tenant</p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {stats.total_tenants}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/15 p-3.5 text-foreground">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Penyelenggara aktif di platform</span>
                </div>
              </CardContent>
            </Card>

            {/* Users Card */}
            <Card className="relative overflow-hidden border-border/40 hover:shadow-md transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Pengguna</p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {stats.total_users}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-accent/40 p-3.5 text-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Admin, Client, dan WO terdaftar</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Scanners Card */}
            <Card className="relative overflow-hidden border-border/40 hover:shadow-md transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Scanner Aktif</p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {stats.active_scanner_devices}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-copper/15 p-3.5 text-ring">
                    <QrCode className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-ring font-medium">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  <span>Perangkat scan QR aktif saat ini</span>
                </div>
              </CardContent>
            </Card>

            {/* Global Guests Card */}
            <Card className="relative overflow-hidden border-border/40 hover:shadow-md transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Tamu</p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {stats.total_guests}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-success/15 p-3.5 text-success">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Jumlah tamu terdaftar sistem</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Performance & System Health Status */}
          <Card className="border-border/40 shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/15 p-2 text-info">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Status Layanan Platform
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Kesehatan infrastruktur dan status konektivitas sistem.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-success animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Database Server</h4>
                    <p className="text-xs text-muted-foreground mt-1">PostgreSQL live & optimal</p>
                    <span className="inline-flex items-center mt-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      Normal
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-success animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Redis Cache Storage</h4>
                    <p className="text-xs text-muted-foreground mt-1">Upstash cache terhubung</p>
                    <span className="inline-flex items-center mt-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      Normal
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-success animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Socket.io WebSocket</h4>
                    <p className="text-xs text-muted-foreground mt-1">Layanan real-time aktif</p>
                    <span className="inline-flex items-center mt-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      Aktif
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
