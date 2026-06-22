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
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Download,
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
import { AuditLogTable } from './components/audit-log-table';
import { AuditLogFilters } from './components/audit-log-filters';

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

      const response = await apiFetch<{ success: boolean; data: AuditLogRecord[] }>(
        `/admin/audit-logs?${params.toString()}`
      );
      if (response.success && response.data) {
        const headers = [
          'ID',
          'Waktu',
          'Aksi',
          'User Email',
          'User Name',
          'Tenant Name',
          'Request ID',
          'Metadata',
        ];
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
      return (
        date.toLocaleString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
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
          <h1 className="font-heading text-foreground flex items-center gap-2 text-3xl font-bold tracking-tight">
            <History className="text-primary h-8 w-8" />
            Log Aktivitas & Audit
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pantau seluruh aktivitas operasional sensitif, transaksi penting, dan audit keamanan
            sistem global.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="border-border/60 hover:bg-muted/20 flex items-center gap-2 self-start"
        >
          <RefreshCw
            className={`text-muted-foreground h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          Perbarui
        </Button>
      </div>

      {/* Audit Log Filters */}
      <AuditLogFilters
        searchQuery={tableState.searchQuery}
        onSearchChange={tableState.setSearchQuery}
        actionFilter={actionFilter}
        onActionChange={(val) => {
          setActionFilter(val);
          tableState.resetPage();
        }}
        tenantFilter={tenantFilter}
        onTenantChange={(val) => {
          setTenantFilter(val);
          tableState.resetPage();
        }}
        tenants={tenants}
        userFilter={userFilter}
        onUserChange={(val) => {
          setUserFilter(val);
          tableState.resetPage();
        }}
        users={users}
        startDate={startDate}
        onStartDateChange={(val) => {
          setStartDate(val);
          tableState.resetPage();
        }}
        endDate={endDate}
        onEndDateChange={(val) => {
          setEndDate(val);
          tableState.resetPage();
        }}
        isExporting={isExporting}
        onExportCSV={handleExportCSV}
      />

      {/* Main Table */}
      {errorMessage ? (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive animate-in fade-in flex flex-col gap-3 rounded-xl border p-4 text-sm duration-200 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      ) : (
        <AuditLogTable
          logs={logs}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={tableState.setPage}
          onSelectLog={setSelectedLog}
        />
      )}

      {/* JSON Metadata Detail Dialog */}
      <ResponsiveDialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <Cpu className="text-primary h-5 w-5" />
            <span>Detail Log Aktivitas & Payload Metadata</span>
          </div>
        }
        description="Berikut detail lengkap data operasional audit log beserta metadata payload yang tersimpan."
        className="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="bg-muted/20 border-border/40 grid grid-cols-2 gap-4 rounded-lg border p-3 text-xs text-foreground">
              <div>
                <span className="text-muted-foreground mb-0.5 block font-medium">
                  WAKTU EKSEKUSI
                </span>
                <span className="text-foreground font-semibold">
                  {formatDate(selectedLog.timestamp)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground mb-0.5 block font-medium">JENIS AKSI</span>
                <Badge
                  className={`border text-[9px] font-bold uppercase ${getActionBadgeColor(selectedLog.action)}`}
                  variant="outline"
                >
                  {getActionNameInIndonesian(selectedLog.action)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground mb-0.5 block font-medium">
                  OPERATOR ID
                </span>
                <span className="text-foreground font-mono text-[10px] font-semibold">
                  {selectedLog.user_id || 'SISTEM'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground mb-0.5 block font-medium">REQUEST ID</span>
                <span className="text-foreground font-mono text-[10px] font-semibold">
                  {selectedLog.request_id}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase text-foreground">
                Payload JSON Metadata
              </span>
              <div className="border-border/40 max-h-64 overflow-auto rounded-lg border bg-zinc-950/80 p-4 font-mono text-xs text-slate-100 shadow-inner">
                {selectedLog.metadata ? (
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500 italic">
                    Tidak ada metadata tambahan yang terasosiasi.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
