'use client';

import { useState } from 'react';
import { GuestTable } from './components/guest-table';
import { GuestFilters } from './components/guest-filters';
import { AddGuestModal } from './components/add-guest-modal';
import { CsvImportModal } from './components/csv-import-modal';
import { QrCodeModal } from './components/qr-code-modal';
import { ApiError } from '@/lib/api';
import type { GuestGroup } from '@wedding/shared';
import { useGuests } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/motion-wrapper';

export interface GuestListItem {
  id: string;
  name: string;
  slug: string;
  group: GuestGroup;
  type: string;
  plus_one_count: number;
  phone: string | null;
  email: string | null;
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
  const [page, setPage] = useState(1);
  const [groupFilter, setGroupFilter] = useState<GuestGroup | ''>('');
  const [statusFilter, setStatusFilter] = useState<GuestStatusFilter | ''>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestListItem | null>(null);
  const [qrGuest, setQrGuest] = useState<GuestListItem | null>(null);

  // Fetch guests using React Query
  const { data, isLoading, error: queryError, refetch } = useGuests({
    page,
    group: groupFilter || undefined,
    status: statusFilter || undefined,
  });

  const guests = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0,
  };

  let errorMessage = '';
  if (queryError) {
    if (queryError instanceof ApiError) {
      const errorData = queryError.data as { message?: string };
      errorMessage = errorData.message || 'Gagal memuat daftar tamu';
    } else {
      errorMessage = 'Terjadi kesalahan saat memuat data';
    }
  }

  const handleGroupFilterChange = (val: GuestGroup | '') => {
    setGroupFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: GuestStatusFilter | '') => {
    setStatusFilter(val);
    setPage(1);
  };

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleGuestSaved() {
    setShowAddModal(false);
    setEditingGuest(null);
  }

  function handleImportComplete() {
    setShowImportModal(false);
    setPage(1);
    refetch();
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Daftar Tamu</h1>
            <p className="mt-1 text-sm text-gray-600">Kelola tamu undangan pernikahan Anda</p>
          </div>
          <div className="flex gap-2">
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
          onPageChange={handlePageChange}
          onEdit={(guest) => setEditingGuest(guest)}
          onShowQr={(guest) => setQrGuest(guest)}
          onRefresh={refetch}
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
          />
        )}

        {/* QR Code Modal */}
        {qrGuest && <QrCodeModal guest={qrGuest} onClose={() => setQrGuest(null)} />}
      </div>
    </FadeIn>
  );
}
