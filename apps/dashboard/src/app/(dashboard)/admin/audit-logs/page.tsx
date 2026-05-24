'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAdminAuditLogs, useAdminTenants, useAdminUsers } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  History,
  Search,
  RefreshCw,
  Calendar,
  Building,
  User,
  Cpu,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AuditLogRecord {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  action: string;
  request_id: string;
  metadata: any;
}

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');

  // Dialog State
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Fetch helper filters data using TanStack Query
  const { data: tenantsData } = useAdminTenants({ page: 1, perPage: 100 });
  const { data: usersData } = useAdminUsers({ page: 1, perPage: 100 });

  const tenants: Tenant[] = tenantsData?.data || [];
  const users: User[] = usersData?.data || [];

  // Fetch audit logs via TanStack Query
  const {
    data: logsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAdminAuditLogs({
    page,
    search: searchTerm,
    action: actionFilter,
    tenantId: tenantFilter,
    userId: userFilter,
  });

  const logs: AuditLogRecord[] = logsData?.data || [];
  const pagination = logsData?.pagination || {
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-success/15 text-success border-transparent';
      case 'logout':
        return 'bg-warning/15 text-warning border-transparent';
      case 'data_export':
        return 'bg-info/15 text-info border-transparent';
      case 'bulk_operation':
        return 'bg-primary/15 text-foreground border-transparent';
      case 'tenant_config_change':
        return 'bg-accent/40 text-foreground border-transparent';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  const getActionNameInIndonesian = (action: string) => {
    switch (action) {
      case 'login':
        return 'Masuk Log';
      case 'logout':
        return 'Keluar Log';
      case 'data_export':
        return 'Ekspor Data';
      case 'bulk_operation':
        return 'Operasi Massal';
      case 'tenant_config_change':
        return 'Perubahan Konfig Tenant';
      default:
        return action;
    }
  };

  // Format error message
  let errorMessage = '';
  if (error) {
    if (error instanceof ApiError) {
      const errData = error.data as { error?: { message?: string } };
      errorMessage = errData.error?.message || 'Gagal memuat log audit aktivitas';
    } else {
      errorMessage = 'Terjadi kesalahan koneksi ke server';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Log Aktivitas & Audit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau seluruh aktivitas operasional sensitif, transaksi penting, dan audit keamanan sistem global.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="flex items-center gap-2 border-border/60 self-start hover:bg-muted/20"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          Perbarui
        </Button>
      </div>

      {/* Advanced Filter Panel */}
      <Card className="border-border/40 shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Panel Filter Lanjutan
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Term */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Aksi atau Request ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background"
              />
            </div>

            {/* Action Filter */}
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Pilih Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Aksi</SelectItem>
                <SelectItem value="login">Masuk Log (Login)</SelectItem>
                <SelectItem value="logout">Keluar Log (Logout)</SelectItem>
                <SelectItem value="data_export">Ekspor Data</SelectItem>
                <SelectItem value="bulk_operation">Operasi Massal</SelectItem>
                <SelectItem value="tenant_config_change">Ubah Konfig Tenant</SelectItem>
              </SelectContent>
            </Select>

            {/* Tenant Filter */}
            <Select
              value={tenantFilter}
              onValueChange={(val) => {
                setTenantFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Pilih Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tenant</SelectItem>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Filter */}
            <Select
              value={userFilter}
              onValueChange={(val) => {
                setUserFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Pilih Pengguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Pengguna</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground font-medium">Memuat log aktivitas...</span>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="flex h-64 items-center justify-center text-destructive font-medium">
            {errorMessage}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground font-medium">Tidak ada log aktivitas yang cocok</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[200px]">Waktu</TableHead>
                  <TableHead className="w-[150px]">Aksi</TableHead>
                  <TableHead>Pengguna / Operator</TableHead>
                  <TableHead>Nama Tenant</TableHead>
                  <TableHead className="w-[120px] text-right">Aksi Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border uppercase px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${getActionBadgeColor(log.action)}`} variant="outline">
                        {getActionNameInIndonesian(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.user_id ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground/60" />
                            {log.user_name || 'Tanpa Nama'}
                          </span>
                          <span className="text-xs text-muted-foreground">{log.user_email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Anonim / Sistem</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.tenant_id ? (
                        <span className="text-foreground text-sm font-medium flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {log.tenant_name || 'Tenant Tidak Diketahui'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Akses Tingkat Global</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-foreground hover:bg-primary/10 rounded-lg h-8 px-2.5"
                      >
                        <Info className="h-4 w-4 shrink-0" />
                        <span className="sr-only">Detail</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Section */}
        {!isLoading && !errorMessage && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-4 bg-card">
            <div className="text-xs text-muted-foreground font-medium">
              Menampilkan {(pagination.page - 1) * pagination.per_page + 1} - {Math.min(pagination.page * pagination.per_page, pagination.total)} dari {pagination.total} log
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="h-8 rounded-lg border-border/60 hover:bg-muted/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <div className="text-xs font-semibold text-foreground px-2">
                Halaman {page} / {pagination.total_pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.total_pages}
                className="h-8 rounded-lg border-border/60 hover:bg-muted/10"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* JSON Metadata Detail Dialog */}
      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-card rounded-xl shadow-xl border border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Detail Log Aktivitas & Payload Metadata
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Berikut detail lengkap data operasional audit log beserta metadata payload yang tersimpan.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-lg border border-border/40">
                <div>
                  <span className="font-medium text-muted-foreground block mb-0.5">WAKTU EKSEKUSI</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedLog.timestamp)}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block mb-0.5">JENIS AKSI</span>
                  <Badge className={`border uppercase text-[9px] font-bold ${getActionBadgeColor(selectedLog.action)}`} variant="outline">
                    {getActionNameInIndonesian(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block mb-0.5">OPERATOR ID</span>
                  <span className="font-semibold text-foreground font-mono text-[10px]">{selectedLog.user_id || 'SISTEM'}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block mb-0.5">REQUEST ID</span>
                  <span className="font-semibold text-foreground font-mono text-[10px]">{selectedLog.request_id}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Payload JSON Metadata</span>
                <div className="bg-zinc-950/80 border border-border/40 text-slate-100 p-4 rounded-lg overflow-auto max-h-64 font-mono text-xs shadow-inner">
                  {selectedLog.metadata ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                  ) : (
                    <span className="italic text-slate-500">Tidak ada metadata tambahan yang terasosiasi.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
