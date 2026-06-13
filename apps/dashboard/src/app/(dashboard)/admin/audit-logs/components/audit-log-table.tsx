'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Calendar, Building, User, Info, History } from 'lucide-react';

export interface AuditLogRecord {
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

interface AuditLogTableProps {
  logs: AuditLogRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSelectLog: (log: AuditLogRecord) => void;
}

export function AuditLogTable({
  logs,
  pagination,
  isLoading,
  onPageChange,
  onSelectLog,
}: AuditLogTableProps) {
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

  return (
    <DataTable
      isLoading={isLoading}
      loadingText="Memuat log aktivitas..."
      isEmpty={logs.length === 0}
      emptyTitle="Tidak ada log aktivitas yang cocok"
      emptyDescription="Coba sesuaikan kata kunci pencarian atau filter Anda."
      emptyIcon={<History className="text-muted-foreground/40 mx-auto mb-3 h-10 w-10" />}
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
      onPageChange={onPageChange}
      paginationText={(p) => (
        <>
          Menampilkan{' '}
          <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
          <span className="text-foreground font-medium">
            {Math.min(p.page * p.per_page, p.total)}
          </span>{' '}
          dari <span className="text-foreground font-medium">{p.total}</span> log
        </>
      )}
    >
      {logs.map((log) => (
        <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
          <TableCell className="text-muted-foreground font-medium whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground/60 h-4 w-4 shrink-0" />
              {formatDate(log.timestamp)}
            </div>
          </TableCell>
          <TableCell>
            <Badge
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${getActionBadgeColor(log.action)}`}
              variant="outline"
            >
              {getActionNameInIndonesian(log.action)}
            </Badge>
          </TableCell>
          <TableCell>
            {log.user_id ? (
              <div className="flex flex-col">
                <span className="text-foreground flex items-center gap-1 text-sm font-semibold">
                  <User className="text-muted-foreground/60 h-3 w-3" />
                  {log.user_name || 'Tanpa Nama'}
                </span>
                <span className="text-muted-foreground text-xs">{log.user_email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm italic">Anonim / Sistem</span>
            )}
          </TableCell>
          <TableCell>
            {log.tenant_id ? (
              <span className="text-foreground flex items-center gap-1 text-sm font-medium">
                <Building className="text-muted-foreground/60 h-3.5 w-3.5" />
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
              onClick={() => onSelectLog(log)}
              className="text-primary hover:text-foreground hover:bg-primary/10 h-8 rounded-lg px-2.5"
            >
              <Info className="h-4 w-4 shrink-0" />
              <span className="sr-only">Detail</span>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}
