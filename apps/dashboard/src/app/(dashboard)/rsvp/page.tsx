'use client';

import { useSocket, type ConnectionStatus } from '@/hooks/use-socket';
import { useRealtimeStats } from '@/hooks/use-realtime-stats';
import { useEvent, useRsvpList } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, CalendarCheck, CheckSquare, UserPlus } from 'lucide-react';
import { FadeIn } from '@/components/ui/motion-wrapper';

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

        {/* RSVP tracking table */}
        <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/40 px-6 py-4 bg-muted/20">
            <h2 className="font-heading text-lg font-semibold text-foreground">Daftar RSVP</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-2 text-sm text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          ) : rsvpList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Belum ada RSVP yang masuk</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="px-6 py-3">Nama Tamu</TableHead>
                    <TableHead className="px-6 py-3">Pilihan Kehadiran</TableHead>
                    <TableHead className="px-6 py-3">Jumlah Tamu</TableHead>
                    <TableHead className="px-6 py-3">Waktu Submission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvpList.map((item) => (
                    <TableRow key={item.guest_id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-foreground">{item.guest_name}</TableCell>
                      <TableCell className="px-6 py-4">
                        <AttendanceBadge attendance={item.attendance} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-foreground">
                        {item.attendance === 'decline' ? '-' : item.guest_count}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {formatTimestamp(item.submitted_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}
