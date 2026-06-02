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
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
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
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
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
      className={`${styles[status] || styles.not_sent} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}
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
            <h1 className="font-heading text-2xl font-bold text-foreground">Tracking RSVP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau konfirmasi kehadiran tamu secara real-time
            </p>
          </div>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>

        {/* Real-time statistics panel */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tamu</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.total_guests}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RSVP Masuk</CardTitle>
              <CalendarCheck className="h-4 w-4 text-copper" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-copper">{stats.total_rsvp}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Check-in</CardTitle>
              <CheckSquare className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.total_checked_in}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Go-Show</CardTitle>
              <UserPlus className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.total_go_show}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar (Aligned with other dashboard menus) */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between'>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative w-full max-w-sm sm:w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama / telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border/60 focus-visible:ring-ring focus-visible:ring-offset-0"
                aria-label="Cari RSVP"
              />
            </div>

            {/* Group Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Grup:
              </span>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border/60 hover:bg-muted/30">
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
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border/60 hover:bg-muted/30">
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
                className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                Reset Filter
              </Button>
            )}
          </div>
          {filteredRsvpList.length > 0 && (
            <Badge variant="outline" className="font-semibold text-xs border-border hidden sm:block">
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
              Menampilkan <span className="font-medium text-foreground">{(p.page - 1) * p.per_page + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(p.page * p.per_page, p.total)}</span> dari{' '}
              <span className="font-medium text-foreground">{p.total}</span> data RSVP
            </>
          )}
        >
          {paginatedRsvpList.map((item) => (
            <TableRow key={item.guest_id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="px-6 py-4 font-medium text-foreground">{item.guest_name}</TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant="secondary" className="font-semibold text-[10px] rounded-full px-2 py-0.5 uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                  {groupLabelMap[item.group || ''] || item.group || '-'}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4 text-muted-foreground font-mono text-xs">
                {item.phone || '-'}
              </TableCell>
              <TableCell className="px-6 py-4">
                <AttendanceBadge attendance={item.attendance} />
              </TableCell>
              <TableCell className="px-6 py-4 text-foreground font-mono">
                {item.attendance === 'decline' ? '-' : item.guest_count}
              </TableCell>
              <TableCell className="px-6 py-4">
                <DeliveryStatusBadge status={item.delivery_status || 'not_sent'} />
              </TableCell>
              <TableCell className="px-6 py-4 text-muted-foreground text-xs">
                {formatTimestamp(item.submitted_at)}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </FadeIn>
  );
}
