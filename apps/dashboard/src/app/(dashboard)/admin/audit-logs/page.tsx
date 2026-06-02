'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useTableState } from '@/hooks/use-table-state';
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
  ChevronRight,
  Download
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

import { useAdminAuditLogs, useAdminTenants, useAdminUsers } from '@/hooks/queries';
import { ADMIN_PER_PAGE, FILTER_OPTIONS_LIMIT } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminAuditLogsPage() {
  const tableState = useTableState<AuditLogRecord>();
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Dialog State
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Fetch helper filters data using TanStack Query
  const { data: tenantsData } = useAdminTenants({ page: 1, perPage: FILTER_OPTIONS_LIMIT });
  const { data: usersData } = useAdminUsers({ page: 1, perPage: FILTER_OPTIONS_LIMIT });

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
    page: tableState.page,
    search: tableState.debouncedSearchQuery,
    action: actionFilter,
    tenantId: tenantFilter,
    userId: userFilter,
    startDate,
    endDate,
  });

  // Client-side CSV Export Logic
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        per_page: '1000',
      });
      if (tableState.debouncedSearchQuery) params.set('search', tableState.debouncedSearchQuery);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (tenantFilter !== 'ALL') params.set('tenant_id', tenantFilter);
      if (userFilter !== 'ALL') params.set('user_id', userFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await apiFetch<{ success: boolean; data: AuditLogRecord[] }>(`/admin/audit-logs?${params.toString()}`);
      if (response.success && response.data) {
        const headers = ['ID', 'Waktu', 'Aksi', 'User Email', 'User Name', 'Tenant Name', 'Request ID', 'Metadata'];
        const csvRows = [headers.join(',')];

        response.data.forEach((log) => {
          const row = [
            `"${log.id}"`,
            `"${formatDate(log.timestamp)}"`,
            `"${getActionNameInIndonesian(log.action)}"`,
            `"${log.user_email || ''}"`,
            `"${log.user_name || ''}"`,
            `"${log.tenant_name || ''}"`,
            `"${log.request_id}"`,
            `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
          ];
          csvRows.push(row.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Log aktivitas berhasil diekspor ke CSV');
      }
    } catch (err) {
      toast.error('Gagal mengekspor log aktivitas');
    } finally {
      setIsExporting(false);
    }
  };

  const logs: AuditLogRecord[] = logsData?.data || [];
  const pagination = logsData?.pagination || {
    page: 1,
    per_page: ADMIN_PER_PAGE,
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
                value={tableState.searchQuery}
                onChange={(e) => {
                  tableState.setSearchQuery(e.target.value);
                }}
                className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background"
              />
            </div>

            {/* Action Filter */}
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                tableState.resetPage();
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
                tableState.resetPage();
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
                tableState.resetPage();
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

          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between pt-4 border-t border-border/40">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex flex-col space-y-1.5 flex-1 max-w-[220px]">
                <span className="text-xs font-semibold text-muted-foreground">Mulai Tanggal:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    tableState.resetPage();
                  }}
                  className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background text-sm"
                />
              </div>

              <div className="flex flex-col space-y-1.5 flex-1 max-w-[220px]">
                <span className="text-xs font-semibold text-muted-foreground">Sampai Tanggal:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    tableState.resetPage();
                  }}
                  className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleExportCSV}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2 border-border/60 bg-card hover:bg-muted/10 rounded-lg text-sm font-semibold h-9"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      {errorMessage ? (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      ) : (
        <DataTable
          isLoading={isLoading}
          loadingText="Memuat log aktivitas..."
          isEmpty={logs.length === 0}
          emptyTitle="Tidak ada log aktivitas yang cocok"
          emptyDescription="Coba sesuaikan kata kunci pencarian atau filter Anda."
          emptyIcon={<History className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />}
          header={
            <>
              <TableHead className="w-[200px]">Waktu</TableHead>
              <TableHead className="w-[150px]">Aksi</TableHead>
              <TableHead>Pengguna / Operator</TableHead>
              <TableHead>Nama Tenant</TableHead>
              <TableHead className="w-[120px] text-right">Aksi Detail</TableHead>
            </>
          }
          pagination={pagination}
          onPageChange={tableState.setPage}
          paginationText={(p) => (
            <>
              Menampilkan <span className="font-medium text-foreground">{(p.page - 1) * p.per_page + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(p.page * p.per_page, p.total)}</span> dari{' '}
              <span className="font-medium text-foreground">{p.total}</span> log
            </>
          )}
        >
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
        </DataTable>
      )}

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
