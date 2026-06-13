'use client';

import { PlanType } from '@wedding/shared';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Calendar, Eye, SlidersHorizontal, Trash2, Building2 } from 'lucide-react';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
  client_username?: string | null;
  client_email?: string | null;
  client_name?: string | null;
}

interface TenantTableProps {
  tenants: Tenant[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onToggleStatus: (tenantId: string, currentStatus: boolean) => void;
  onOpenDetail: (tenant: Tenant) => void;
  onOpenQuota: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
}

export function TenantTable({
  tenants,
  pagination,
  isLoading,
  onPageChange,
  onPerPageChange,
  onToggleStatus,
  onOpenDetail,
  onOpenQuota,
  onDelete,
}: TenantTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DataTable
      isLoading={isLoading}
      loadingText="Memuat data tenant..."
      isEmpty={tenants.length === 0}
      emptyTitle="Tidak ada tenant ditemukan"
      emptyDescription="Coba sesuaikan kata kunci pencarian atau filter tipe paket Anda."
      emptyIcon={<Building2 className="text-muted-foreground/30 mx-auto mb-3 h-12 w-12" />}
      header={
        <>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold tracking-wider uppercase">
            Nama Tenant
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Slug
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Tipe Paket
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Tanggal Dibuat
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold tracking-wider uppercase">
            Status Aktif
          </TableHead>
        </>
      }
      pagination={pagination}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      paginationText={(p) => (
        <>
          Menampilkan{' '}
          <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
          <span className="text-foreground font-medium">
            {Math.min(p.page * p.per_page, p.total)}
          </span>{' '}
          dari <span className="text-foreground font-medium">{p.total}</span> tenant
        </>
      )}
    >
      {tenants.map((tenant) => (
        <TableRow
          key={tenant.id}
          className="border-border/40 hover:bg-muted/20 cursor-pointer border-b"
          onClick={() => onOpenDetail(tenant)}
        >
          <TableCell className="text-foreground px-6 py-4 font-medium">{tenant.name}</TableCell>
          <TableCell className="text-muted-foreground px-3 py-4 text-sm">
            /{tenant.slug}
          </TableCell>
          <TableCell className="px-3 py-4">
            {tenant.plan_type === PlanType.ENTERPRISE ? (
              <Badge className="border-purple-100 bg-purple-50 font-medium text-purple-700 shadow-none hover:opacity-90 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400">
                Enterprise
              </Badge>
            ) : tenant.plan_type === PlanType.PREMIUM ? (
              <Badge className="border-indigo-100 bg-indigo-50 font-medium text-indigo-700 shadow-none hover:opacity-90 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400">
                Premium
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border/50 hover:bg-muted font-medium shadow-none">
                Basic
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-muted-foreground px-3 py-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="text-muted-foreground h-3.5 w-3.5" />
              <span>{formatDate(tenant.created_at)}</span>
            </div>
          </TableCell>
          <TableCell className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-3">
              <span
                className={`text-xs font-semibold ${tenant.is_active ? 'text-success' : 'text-muted-foreground'}`}
              >
                {tenant.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
              <Switch
                checked={tenant.is_active}
                onCheckedChange={() => onToggleStatus(tenant.id, tenant.is_active)}
                aria-label="Toggle status keaktifan tenant"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                onClick={() => onOpenDetail(tenant)}
                title="Lihat Detail"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                onClick={() => onOpenQuota(tenant)}
                title="Kelola Kuota"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => onDelete(tenant)}
                title="Hapus Tenant"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}
