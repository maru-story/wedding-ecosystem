'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSocket, type ConnectionStatus } from '@/hooks/use-socket';
import { useRealtimeStats } from '@/hooks/use-realtime-stats';
import { useEvent, useRsvpList } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Users, CalendarCheck, CheckSquare, UserPlus, Search } from 'lucide-react';
import { FadeIn } from '@/components/ui/motion-wrapper';

const groupLabelMap: Record<string, string> = {
  family: 'Keluarga',
  friend: 'Teman',
  colleague: 'Rekan Kerja',
  vip: 'VIP',
};

/** Map attendance type to Bahasa Indonesia label */
function getAttendanceLabel(attendance: string): string {
  switch (attendance) {
    case 'akad':
      return 'Akad';
    case 'resepsi':
      return 'Resepsi';
    case 'both':
      return 'Keduanya';
    case 'decline':
      return 'Menolak';
    default:
      return '-';
  }
}

/** Format timestamp to locale string */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Connection status badge component */
function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const isConnected = status === 'terhubung';
  return (
    <Badge
      variant="outline"
      className={
        isConnected
          ? 'bg-success/15 text-success border-success/30 font-medium'
          : 'bg-destructive/10 text-destructive border-destructive/20 font-medium'
      }
      role="status"
      aria-live="polite"
      aria-label={`Status koneksi: ${status}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`}
      />
      {status === 'terhubung' ? 'Terhubung (Real-time)' : 'Terputus'}
    </Badge>
  );
}

/** Attendance badge component */
function AttendanceBadge({ attendance }: { attendance: string }) {
  const styles: Record<string, string> = {
    akad: 'bg-primary/20 text-foreground border-transparent hover:bg-primary/30',
    resepsi: 'bg-info/20 text-info border-transparent hover:bg-info/30',
    both: 'bg-success/20 text-success border-transparent hover:bg-success/30',
    decline: 'bg-destructive/15 text-destructive border-transparent hover:bg-destructive/20',
  };

  return (
    <Badge
      variant="outline"
      className={styles[attendance] || 'bg-muted text-muted-foreground border-transparent'}
    >
      {getAttendanceLabel(attendance)}
    </Badge>
  );
}

/** Delivery status badge component */
function DeliveryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: 'bg-success/15 text-success border-success/30',
    failed: 'bg-destructive/15 text-destructive border-destructive/30',
    not_sent: 'bg-muted text-muted-foreground border-transparent',
  };

  const labels: Record<string, string> = {
    sent: 'Terkirim',
    failed: 'Gagal',
    not_sent: 'Belum Kirim',
  };

  return (
    <Badge
      variant="outline"
      className={`${styles[status] || styles.not_sent} rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase`}
    >
      {labels[status] || 'Belum Kirim'}
    </Badge>
  );
}

export default function RsvpTrackingPage() {
  const { data: eventData, isLoading: isEventLoading } = useEvent();
  const eventId = eventData?.id || null;

  const { isLoading: isRsvpListLoading } = useRsvpList(eventId);

  // WebSocket connection
  const { socket, connectionStatus } = useSocket({
    eventId,
    autoConnect: true,
  });

  // Real-time stats and RSVP list
  const { stats, rsvpList } = useRealtimeStats({
    socket,
    eventId,
  });

  const isLoading = isEventLoading || (!!eventId && isRsvpListLoading);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, groupFilter, statusFilter]);

  // Compute filtered list
  const filteredRsvpList = useMemo(() => {
    return rsvpList.filter((item) => {
      // 1. Search name & phone
      const matchesSearch =
        item.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.phone && item.phone.includes(searchQuery));

      // 2. Group filter
      const matchesGroup = groupFilter === 'all' || item.group === groupFilter;

      // 3. Status filter
      const matchesStatus = statusFilter === 'all' || item.attendance === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [rsvpList, searchQuery, groupFilter, statusFilter]);

  // Compute paginated list
  const paginatedRsvpList = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    return filteredRsvpList.slice(startIndex, startIndex + perPage);
  }, [filteredRsvpList, page, perPage]);

  const totalPages = Math.ceil(filteredRsvpList.length / perPage);

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Page header with connection status */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-foreground text-2xl font-bold">Tracking RSVP</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pantau konfirmasi kehadiran tamu secara real-time
            </p>
          </div>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>

        {/* Real-time statistics panel */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Tamu
              </CardTitle>
              <Users className="text-primary h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stats.total_guests}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                RSVP Masuk
              </CardTitle>
              <CalendarCheck className="text-copper h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-copper text-2xl font-bold">{stats.total_rsvp}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Check-in</CardTitle>
              <CheckSquare className="text-success h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-success text-2xl font-bold">{stats.total_checked_in}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Go-Show</CardTitle>
              <UserPlus className="text-warning h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-warning text-2xl font-bold">{stats.total_go_show}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar (Aligned with other dashboard menus) */}
        <div className="flex flex-col justify-between sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative w-full max-w-sm sm:w-[240px]">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                type="text"
                placeholder="Cari nama / telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
                aria-label="Cari RSVP"
              />
            </div>

            {/* Group Filter */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">Grup:</span>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
                  <SelectValue placeholder="Semua Grup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Grup</SelectItem>
                  <SelectItem value="family">Keluarga</SelectItem>
                  <SelectItem value="friend">Teman</SelectItem>
                  <SelectItem value="colleague">Rekan Kerja</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status/Attendance Filter */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="akad">Hadir Akad</SelectItem>
                  <SelectItem value="resepsi">Hadir Resepsi</SelectItem>
                  <SelectItem value="both">Hadir Keduanya</SelectItem>
                  <SelectItem value="decline">Menolak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            {(searchQuery || groupFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setGroupFilter('all');
                  setStatusFilter('all');
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
              >
                Reset Filter
              </Button>
            )}
          </div>
          {filteredRsvpList.length > 0 && (
            <Badge
              variant="outline"
              className="border-border hidden text-xs font-semibold sm:block"
            >
              {filteredRsvpList.length} data
            </Badge>
          )}
        </div>

        {/* Guest Table using DataTable */}
        <DataTable
          isLoading={isLoading}
          loadingText="Memuat data RSVP..."
          isEmpty={filteredRsvpList.length === 0}
          emptyTitle="Tidak ada data RSVP cocok"
          emptyDescription="Silakan cari dengan kata kunci lain atau ubah filter status/grup"
          header={
            <>
              <TableHead className="px-6 py-3">Nama Tamu</TableHead>
              <TableHead className="px-6 py-3">Grup / Kategori</TableHead>
              <TableHead className="px-6 py-3">Kontak</TableHead>
              <TableHead className="px-6 py-3">Pilihan Kehadiran</TableHead>
              <TableHead className="px-6 py-3">Jumlah Tamu</TableHead>
              <TableHead className="px-6 py-3">Status Kirim WA</TableHead>
              <TableHead className="px-6 py-3">Waktu Submission</TableHead>
            </>
          }
          pagination={{
            page,
            per_page: perPage,
            total: filteredRsvpList.length,
            total_pages: totalPages,
          }}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          paginationText={(p) => (
            <>
              Menampilkan{' '}
              <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
              <span className="text-foreground font-medium">
                {Math.min(p.page * p.per_page, p.total)}
              </span>{' '}
              dari <span className="text-foreground font-medium">{p.total}</span> data RSVP
            </>
          )}
        >
          {paginatedRsvpList.map((item) => (
            <TableRow key={item.guest_id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-foreground px-6 py-4 font-medium">
                {item.guest_name}
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                >
                  {groupLabelMap[item.group || ''] || item.group || '-'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground px-6 py-4 font-mono text-xs">
                {item.phone || '-'}
              </TableCell>
              <TableCell className="px-6 py-4">
                <AttendanceBadge attendance={item.attendance} />
              </TableCell>
              <TableCell className="text-foreground px-6 py-4 font-mono">
                {item.attendance === 'decline' ? '-' : item.guest_count}
              </TableCell>
              <TableCell className="px-6 py-4">
                <DeliveryStatusBadge status={item.delivery_status || 'not_sent'} />
              </TableCell>
              <TableCell className="text-muted-foreground px-6 py-4 text-xs">
                {formatTimestamp(item.submitted_at)}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </FadeIn>
  );
}
