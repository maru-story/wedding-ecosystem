'use client';

import { useState } from 'react';
import { GuestTable } from './components/guest-table';
import { GuestFilters } from './components/guest-filters';
import { AddGuestModal } from './components/add-guest-modal';
import { CsvImportModal } from './components/csv-import-modal';
import { QrCodeModal } from './components/qr-code-modal';
import { ApiError } from '@/lib/api';
import type { GuestGroup } from '@wedding/shared';
import { useGuests, useEvent, useDashboardStats } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/motion-wrapper';
import { DEFAULT_MAX_GUESTS, GUESTS_PER_PAGE } from '@/lib/constants';
import { useTableState } from '@/hooks/use-table-state';

import { RefreshCw } from 'lucide-react';

export interface GuestListItem {
  id: string;
  name: string;
  slug: string;
  group: GuestGroup;
  type: string;
  plus_one_count: number;
  phone: string | null;
  delivery_status: string;
  rsvp_status: string | null;
  check_in_status: boolean;
  qr_active: boolean;
}

export interface PaginatedGuestList {
  data: GuestListItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

type GuestStatusFilter = 'belum_rsvp' | 'confirmed' | 'declined' | 'checked_in';

export default function GuestsPage() {
  const tableState = useTableState<GuestListItem>({
    initialPerPage: GUESTS_PER_PAGE,
  });

  const [groupFilter, setGroupFilter] = useState<GuestGroup | ''>('');
  const [statusFilter, setStatusFilter] = useState<GuestStatusFilter | ''>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestListItem | null>(null);
  const [qrGuest, setQrGuest] = useState<GuestListItem | null>(null);

  // Fetch guests using React Query
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
    isFetching,
  } = useGuests({
    page: tableState.page,
    perPage: tableState.perPage,
    group: groupFilter || undefined,
    status: statusFilter || undefined,
    q: tableState.debouncedSearchQuery || undefined,
  });

  const { data: eventData } = useEvent();
  const { data: stats } = useDashboardStats();
  const maxGuests = eventData?.event_config?.max_guests ?? DEFAULT_MAX_GUESTS;
  const totalGuests = stats?.total_guests ?? 0;

  const guests = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: tableState.perPage,
    total: 0,
    total_pages: 0,
  };

  const isFiltered = !!groupFilter || !!statusFilter || !!tableState.searchQuery;

  let errorMessage = '';
  if (queryError) {
    if (queryError instanceof ApiError) {
      const errorData = queryError.data as { message?: string };
      errorMessage = errorData.message || 'Gagal memuat daftar tamu';
    } else {
      errorMessage = 'Terjadi kesalahan saat memuat data';
    }
  }

  // Get selection helpers dynamically
  const { allSelected, someSelected, handleSelectAll, handleSelectOne } =
    tableState.getSelectionHelpers(guests);

  const handleGroupFilterChange = (val: GuestGroup | '') => {
    setGroupFilter(val);
    tableState.resetPage();
  };

  const handleStatusFilterChange = (val: GuestStatusFilter | '') => {
    setStatusFilter(val);
    tableState.resetPage();
  };

  function handleGuestSaved() {
    setShowAddModal(false);
    setEditingGuest(null);
  }

  // Reload statistics and page list
  const { refetch: refetchStats } = useDashboardStats();

  function handleImportComplete() {
    setShowImportModal(false);
    tableState.resetPage();
    refetch();
    refetchStats();
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Daftar Tamu</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-gray-600">
                Kelola tamu undangan pernikahan Anda (Kapasitas: {totalGuests} / {maxGuests})
              </p>
              {isFiltered && (
                <Badge
                  variant="secondary"
                  className="bg-accent/30 text-accent-foreground border-accent/20 text-xs font-normal"
                >
                  {pagination.total} hasil ditemukan
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Import CSV
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
            >
              + Tambah Tamu
            </Button>
          </div>
        </div>

        {/* Filters */}
        <GuestFilters
          searchQuery={tableState.searchQuery}
          onSearchChange={tableState.setSearchQuery}
          groupFilter={groupFilter}
          statusFilter={statusFilter}
          onGroupChange={handleGroupFilterChange}
          onStatusChange={handleStatusFilterChange}
        />

        {/* Error */}
        {errorMessage && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Guest Table */}
        <GuestTable
          guests={guests}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={tableState.setPage}
          onPerPageChange={tableState.setPerPage}
          onEdit={(guest) => setEditingGuest(guest)}
          onShowQr={(guest) => setQrGuest(guest)}
          selectedIds={tableState.selectedIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onClearSelection={tableState.clearSelection}
        />

        {/* Add/Edit Guest Modal */}
        {(showAddModal || editingGuest) && (
          <AddGuestModal
            guest={editingGuest}
            onClose={() => {
              setShowAddModal(false);
              setEditingGuest(null);
            }}
            onSaved={handleGuestSaved}
          />
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <CsvImportModal
            onClose={() => setShowImportModal(false)}
            onComplete={handleImportComplete}
            currentCount={pagination.total}
          />
        )}

        {/* QR Code Modal */}
        {qrGuest && <QrCodeModal guest={qrGuest} onClose={() => setQrGuest(null)} />}
      </div>
    </FadeIn>
  );
}
