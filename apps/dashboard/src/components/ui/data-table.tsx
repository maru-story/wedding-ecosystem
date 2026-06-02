'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginationData {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface DataTableProps {
  isLoading?: boolean;
  loadingText?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyState?: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
  bulkActionsLabel?: string;
  paginationText?: (pagination: PaginationData) => React.ReactNode;
}

export function DataTable({
  isLoading = false,
  loadingText = 'Memuat data...',
  isEmpty = false,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Belum ada data terdaftar',
  emptyIcon,
  emptyState,
  header,
  children,
  pagination,
  onPageChange,
  onPerPageChange,
  selectedCount = 0,
  bulkActions,
  bulkActionsLabel,
  paginationText,
}: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    if (emptyState) return <>{emptyState}</>;

    return (
      <div className="rounded-xl border border-border/40 bg-card p-12 text-center shadow-sm">
        {emptyIcon ? (
          emptyIcon
        ) : (
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )}
        <p className="mt-4 text-foreground font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  const defaultPaginationText = (p: PaginationData) => {
    const from = (p.page - 1) * p.per_page + 1;
    const to = Math.min(p.page * p.per_page, p.total);
    return (
      <>
        Menampilkan <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> dari{' '}
        <span className="font-medium text-foreground">{p.total}</span> data
      </>
    );
  };

  return (
    <div className="space-y-4">
      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/40 px-4 py-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {bulkActionsLabel ? bulkActionsLabel : `${selectedCount} terpilih`}
            </span>
          </div>
          {bulkActions}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>{header}</TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>

      {pagination && (pagination.total_pages > 1 || onPerPageChange) && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-4">
            {onPerPageChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Tampilkan:</span>
                <Select
                  value={pagination.per_page.toString()}
                  onValueChange={(val) => onPerPageChange(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-8 w-[135px] bg-card border-border/60">
                    <SelectValue placeholder={pagination.per_page.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / halaman</SelectItem>
                    <SelectItem value="20">20 / halaman</SelectItem>
                    <SelectItem value="50">50 / halaman</SelectItem>
                    <SelectItem value="100">100 / halaman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {pagination.total > 0 && (
              <p className="text-sm text-muted-foreground">
                {paginationText ? paginationText(pagination) : defaultPaginationText(pagination)}
              </p>
            )}
          </div>
          {pagination.total_pages > 1 && onPageChange && (
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Halaman sebelumnya"
                className="h-8 hover:bg-accent border-border/60 hover:text-foreground"
              >
                ← Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                aria-label="Halaman berikutnya"
                className="h-8 hover:bg-accent border-border/60 hover:text-foreground"
              >
                Selanjutnya →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
