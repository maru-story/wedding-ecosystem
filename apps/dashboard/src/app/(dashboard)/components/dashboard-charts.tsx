'use client';

import { useDashboardStats } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Send,
  Clock,
  Heart,
  TrendingUp,
  UserCheck,
  Crown,
} from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion-wrapper';

// --- Custom Donut Chart (SVG) ---
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string | number;
  centerSublabel?: string;
}

export function DonutChart({ data, centerLabel, centerSublabel }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedAngle = 0;
  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="150" height="150" viewBox="0 0 140 140" className="-rotate-90 transform">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          data.map((item, index) => {
            if (item.value === 0) return null;
            const percentage = (item.value / total) * 100;
            const strokeDashoffset = circumference - (circumference * percentage) / 100;
            const rotation = (accumulatedAngle / total) * 360;
            accumulatedAngle += item.value;

            return (
              <circle
                key={index}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300 hover:opacity-85"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '70px 70px',
                }}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-foreground text-xl font-extrabold">
          {centerLabel !== undefined ? centerLabel : total}
        </span>
        {centerSublabel && (
          <span className="text-muted-foreground mt-0.5 text-[9px] font-bold tracking-wider uppercase">
            {centerSublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Custom Bar Chart (HTML/CSS) ---
interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  height?: number;
}

export function BarChart({ data, height = 180 }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className="flex w-full items-end justify-around px-2 pt-6"
      style={{ height: `${height}px` }}
    >
      {data.map((item, index) => {
        const heightPercentage = (item.value / maxVal) * 100;
        return (
          <div key={index} className="group relative flex w-14 flex-col items-center">
            <div className="bg-foreground text-background absolute -top-8 z-10 hidden flex-col items-center rounded px-2 py-1 text-[10px] font-bold whitespace-nowrap shadow-md group-hover:flex">
              <span>{item.value.toLocaleString('id-ID')}</span>
            </div>

            <div
              style={{
                height: `${Math.max(heightPercentage, 6)}%`,
                backgroundColor: item.color,
                width: '1.5rem',
              }}
              className="cursor-pointer rounded-t-md shadow-xs transition-all duration-300 hover:opacity-90"
            />
            <span className="text-muted-foreground mt-2 w-full truncate text-center text-[10px] font-semibold">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Custom Line/Area Chart (SVG) ---
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export function LineChart({ data, height = 180 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground bg-muted/10 flex h-[180px] items-center justify-center rounded-xl border border-dashed text-sm">
        Belum ada data pendaftaran RSVP
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 5);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal;

  const width = 450;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD =
    data.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : '';

  return (
    <div className="w-full scrollbar-none overflow-x-auto">
      <svg width={width} height={height} className="mx-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = paddingY + (i / 3) * chartHeight;
          const val = Math.round(maxVal - (i / 3) * range);
          return (
            <g key={i} className="opacity-40">
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <text
                x={paddingX - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[9px] font-semibold"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group/point relative">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--color-background)"
              stroke="var(--color-primary)"
              strokeWidth="2"
              className="hover:r-6 cursor-pointer transition-all"
            />
            <title>{`${p.label}: ${p.value} RSVP`}</title>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.length > 0 &&
          [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map(
            (p, i) => {
              if (!p) return null;
              return (
                <text
                  key={i}
                  x={p.x}
                  y={height - 2}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px] font-semibold"
                >
                  {p.label}
                </text>
              );
            }
          )}
      </svg>
    </div>
  );
}

interface DashboardStatsPayload {
  total_guests: number;
  total_rsvp: number;
  total_checked_in: number;
  total_go_show: number;
  rsvp_confirmed: number;
  rsvp_declined: number;
  rsvp_pending: number;
  total_pax_invited: number;
  total_pax_confirmed: number;
  attendance_akad: number;
  attendance_resepsi: number;
  attendance_both: number;
  checked_in_invited: number;
  checked_in_go_show: number;
  delivery_sent: number;
  delivery_not_sent: number;
  delivery_failed: number;
  vip_total: number;
  vip_confirmed: number;
  vip_checked_in: number;
  total_wishes: number;
  visible_wishes: number;
  rsvp_trend: { date: string; count: number }[];
  checkin_peak: { timeSlot: string; count: number }[];
  group_breakdown: Record<
    string,
    {
      total: number;
      confirmed: number;
      declined: number;
      pending: number;
      checked_in: number;
    }
  >;
}

// --- Main Charts Panel ---
export function DashboardCharts() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <ChartsSkeletons />;

  // Default structure
  const safeStats: DashboardStatsPayload = (stats as DashboardStatsPayload) || {
    total_guests: 0,
    total_rsvp: 0,
    total_checked_in: 0,
    total_go_show: 0,
    rsvp_confirmed: 0,
    rsvp_declined: 0,
    rsvp_pending: 0,
    total_pax_invited: 0,
    total_pax_confirmed: 0,
    attendance_akad: 0,
    attendance_resepsi: 0,
    attendance_both: 0,
    checked_in_invited: 0,
    checked_in_go_show: 0,
    delivery_sent: 0,
    delivery_not_sent: 0,
    delivery_failed: 0,
    vip_total: 0,
    vip_confirmed: 0,
    vip_checked_in: 0,
    total_wishes: 0,
    visible_wishes: 0,
    rsvp_trend: [],
    checkin_peak: [],
    group_breakdown: {
      family: { total: 0, confirmed: 0, declined: 0, pending: 0, checked_in: 0 },
      friend: { total: 0, confirmed: 0, declined: 0, pending: 0, checked_in: 0 },
      colleague: { total: 0, confirmed: 0, declined: 0, pending: 0, checked_in: 0 },
      vip: { total: 0, confirmed: 0, declined: 0, pending: 0, checked_in: 0 },
    },
  };

  // 1. RSVP Donut Data
  const rsvpDonutData = [
    { label: 'Hadir', value: safeStats.rsvp_confirmed, color: '#10b981' }, // emerald
    { label: 'Menolak', value: safeStats.rsvp_declined, color: '#ef4444' }, // red
    { label: 'Pending', value: safeStats.rsvp_pending, color: '#9ca3af' }, // gray
  ];

  // 2. RSVP Sessional Data
  const rsvpSessionData = [
    { label: 'Akad', value: safeStats.attendance_akad, color: '#0ea5e9' }, // sky
    { label: 'Resepsi', value: safeStats.attendance_resepsi, color: '#f59e0b' }, // amber
    { label: 'Kedua Sesi', value: safeStats.attendance_both, color: '#8b5cf6' }, // purple
  ];

  // 3. Delivery Status Data
  const deliveryData = [
    { label: 'Terkirim', value: safeStats.delivery_sent, color: '#25D366' }, // whatsapp green
    { label: 'Belum Kirim', value: safeStats.delivery_not_sent, color: '#e5e7eb' },
    { label: 'Gagal', value: safeStats.delivery_failed, color: '#f43f5e' },
  ];

  // 4. On-site Check-in Data
  const checkinData = [
    { label: 'Sudah Check-in', value: safeStats.total_checked_in, color: '#10b981' },
    {
      label: 'Belum Datang',
      value: Math.max(safeStats.total_guests - safeStats.total_checked_in, 0),
      color: '#e5e7eb',
    },
  ];

  // Format Group Labels
  const groupLabelMap: Record<string, string> = {
    family: 'Keluarga',
    friend: 'Teman',
    colleague: 'Rekan Kerja',
    vip: 'VIP',
  };

  return (
    <FadeIn delay={0.1}>
      <Tabs defaultValue="pre-event" className="w-full space-y-6">
        <div className="border-border flex items-center justify-between border-b pb-3">
          <TabsList className="bg-muted p-1">
            <TabsTrigger
              value="pre-event"
              className="text-xs font-semibold tracking-wider uppercase"
            >
              Pra-Acara (Persiapan)
            </TabsTrigger>
            <TabsTrigger
              value="event-day"
              className="text-xs font-semibold tracking-wider uppercase"
            >
              Hari-H (Pelaksanaan)
            </TabsTrigger>
          </TabsList>

          <Badge
            variant="outline"
            className="text-muted-foreground border-border font-mono text-[10px] font-semibold uppercase"
          >
            Live Analytics
          </Badge>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: PRE-EVENT (PREPARATION)                               */}
        {/* ============================================================ */}
        <TabsContent value="pre-event" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: RSVP Confirmation */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <CheckCircle2 className="text-success h-4.5 w-4.5" />
                  Konfirmasi Kehadiran Tamu
                </CardTitle>
                <CardDescription className="text-xs">
                  Rasio respon undangan oleh tamu
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart
                  data={rsvpDonutData}
                  centerLabel={`${Math.round(((safeStats.rsvp_confirmed + safeStats.rsvp_declined) / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Respon"
                />

                {/* Legends */}
                <div className="border-border/40 mt-5 grid w-full grid-cols-3 gap-4 border-t pt-4 text-center">
                  <div>
                    <span className="bg-success mr-1.5 inline-block h-2.5 w-2.5 rounded-full" />
                    <span className="text-muted-foreground block text-[10px] font-semibold md:inline">
                      Hadir
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold">
                      {safeStats.rsvp_confirmed}
                    </p>
                  </div>
                  <div>
                    <span className="bg-destructive mr-1.5 inline-block h-2.5 w-2.5 rounded-full" />
                    <span className="text-muted-foreground block text-[10px] font-semibold md:inline">
                      Menolak
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold">
                      {safeStats.rsvp_declined}
                    </p>
                  </div>
                  <div>
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
                    <span className="text-muted-foreground block text-[10px] font-semibold md:inline">
                      Pending
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold">
                      {safeStats.rsvp_pending}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Pax Catering Stats */}
            <Card className="border-border/60 bg-card flex flex-col justify-between shadow-xs">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Users className="text-primary h-4.5 w-4.5" />
                  Estimasi Porsi Makanan (Pax)
                </CardTitle>
                <CardDescription className="text-xs">
                  Prediksi kuantitas porsi catering
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="bg-primary/5 border-primary/10 flex flex-col items-center rounded-xl border p-5 text-center">
                  <span className="text-primary text-xs font-semibold tracking-wider uppercase">
                    Total Estimasi Pax Hadir
                  </span>
                  <span className="text-primary mt-1.5 font-mono text-4xl font-extrabold">
                    {safeStats.total_pax_confirmed}
                  </span>
                  <span className="text-muted-foreground mt-1.5 text-[10px]">
                    Penjumlahan pax riil RSVP konfirmasi
                  </span>
                </div>

                {/* Comparison progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">
                      Rasio Pax Hadir vs Total Terundang
                    </span>
                    <span className="font-mono">
                      {safeStats.total_pax_confirmed} / {safeStats.total_pax_invited} Pax
                    </span>
                  </div>
                  <div className="bg-secondary h-2.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((safeStats.total_pax_confirmed / Math.max(safeStats.total_pax_invited, 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Session Distribution */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Clock className="text-info h-4.5 w-4.5" />
                  Distribusi Kehadiran Sesi
                </CardTitle>
                <CardDescription className="text-xs">
                  Jumlah tamu pada masing-masing sesi
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <BarChart data={rsvpSessionData} />
              </CardContent>
            </Card>

            {/* Card 4: WhatsApp Invitation Delivery */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Send className="h-4.5 w-4.5 text-emerald-500" />
                  Progress Pengiriman Undangan
                </CardTitle>
                <CardDescription className="text-xs">
                  Tamu yang sudah dikirimi pesan WA
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart
                  data={deliveryData}
                  centerLabel={`${Math.round((safeStats.delivery_sent / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Terkirim"
                />

                {/* Legends */}
                <div className="border-border/40 mt-5 grid w-full grid-cols-3 gap-2 border-t pt-4 text-center text-[10px]">
                  <div>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#25D366]" />
                    <span className="text-muted-foreground block font-semibold">Terkirim</span>
                    <p className="mt-0.5 font-mono text-xs font-extrabold">
                      {safeStats.delivery_sent}
                    </p>
                  </div>
                  <div>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gray-300" />
                    <span className="text-muted-foreground block font-semibold">Belum</span>
                    <p className="mt-0.5 font-mono text-xs font-extrabold">
                      {safeStats.delivery_not_sent}
                    </p>
                  </div>
                  <div>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground block font-semibold">Gagal</span>
                    <p className="mt-0.5 font-mono text-xs font-extrabold">
                      {safeStats.delivery_failed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: RSVP Timeline Trend */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <TrendingUp className="text-primary h-4.5 w-4.5" />
                  Tren Kecepatan RSVP Tamu (Akumulatif)
                </CardTitle>
                <CardDescription className="text-xs">
                  Kecepatan tamu dalam memberikan konfirmasi
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <LineChart
                  data={safeStats.rsvp_trend.map((t) => ({ label: t.date, value: t.count }))}
                />
              </CardContent>
            </Card>

            {/* Card 6: Guest Distribution by Group */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-bold">
                  Rasio Kehadiran Berdasarkan Grup Relasi
                </CardTitle>
                <CardDescription className="text-xs">
                  Perbandingan status konfirmasi per kategori relasi
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(safeStats.group_breakdown).map(
                    ([group, groupStats]: [string, any]) => {
                      const pct = Math.round(
                        (groupStats.confirmed / Math.max(groupStats.total, 1)) * 100
                      );
                      return (
                        <div
                          key={group}
                          className="border-border/50 bg-muted/10 flex flex-col justify-between space-y-3 rounded-xl border p-4"
                        >
                          <div className="border-border/40 flex items-center justify-between border-b pb-2">
                            <span className="text-foreground text-xs font-semibold tracking-wider uppercase">
                              {groupLabelMap[group] || group}
                            </span>
                            <Badge
                              variant="secondary"
                              className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold"
                            >
                              {groupStats.total} Tamu
                            </Badge>
                          </div>

                          <div className="space-y-1.5">
                            <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold">
                              <span>RSVP Hadir:</span>
                              <span className="text-success font-mono">
                                {groupStats.confirmed} ({pct}%)
                              </span>
                            </div>
                            <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                              <div
                                className="bg-success h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-muted-foreground border-border/30 grid grid-cols-3 gap-1 border-t pt-1 text-center text-[9px]">
                            <div>
                              <span className="text-foreground block font-mono text-xs font-bold">
                                {groupStats.confirmed}
                              </span>
                              <span>Hadir</span>
                            </div>
                            <div>
                              <span className="text-foreground block font-mono text-xs font-bold">
                                {groupStats.declined}
                              </span>
                              <span>Tolak</span>
                            </div>
                            <div>
                              <span className="text-foreground block font-mono text-xs font-bold">
                                {groupStats.pending}
                              </span>
                              <span>Pending</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: EVENT DAY (LIVE EXECUTION)                            */}
        {/* ============================================================ */}
        <TabsContent value="event-day" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Live Check-in Ring */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <UserCheck className="text-success h-4.5 w-4.5" />
                  Rasio Kehadiran Venue (Hari-H)
                </CardTitle>
                <CardDescription className="text-xs">
                  Persentase kedatangan tamu di lokasi
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart
                  data={checkinData}
                  centerLabel={`${Math.round((safeStats.total_checked_in / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Tiba"
                />

                {/* Legends */}
                <div className="border-border/40 mt-5 grid w-full grid-cols-2 gap-4 border-t pt-4 text-center">
                  <div>
                    <span className="bg-success mr-1.5 inline-block h-2.5 w-2.5 rounded-full" />
                    <span className="text-muted-foreground block text-[10px] font-semibold md:inline">
                      Sudah Datang
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold">
                      {safeStats.total_checked_in}
                    </p>
                  </div>
                  <div>
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
                    <span className="text-muted-foreground block text-[10px] font-semibold md:inline">
                      Belum Datang
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold">
                      {Math.max(safeStats.total_guests - safeStats.total_checked_in, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: VIP Attendance Ring */}
            <Card className="border-border/60 bg-card flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Crown className="h-4.5 w-4.5 text-amber-500" />
                  Monitoring Tamu VIP
                </CardTitle>
                <CardDescription className="text-xs">
                  Kehadiran khusus tamu VIP terdaftar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="flex flex-col items-center rounded-xl border border-amber-500/10 bg-amber-500/5 p-5 text-center">
                  <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase">
                    VIP Sudah Tiba di Venue
                  </span>
                  <span className="mt-1.5 font-mono text-4xl font-extrabold text-amber-600">
                    {safeStats.vip_checked_in}{' '}
                    <span className="text-muted-foreground text-lg">/ {safeStats.vip_total}</span>
                  </span>
                  <span className="text-muted-foreground mt-1.5 text-[10px]">
                    Tamu penting terdaftar dengan tag VIP
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Persentase Kehadiran VIP</span>
                    <span className="font-mono text-amber-600">
                      {safeStats.vip_total > 0
                        ? Math.round((safeStats.vip_checked_in / safeStats.vip_total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${safeStats.vip_total > 0 ? (safeStats.vip_checked_in / safeStats.vip_total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Wishes sentiment */}
            <Card className="border-border/60 bg-card flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Heart className="h-4.5 w-4.5 animate-pulse text-rose-500" />
                  Pesan Ucapan & Doa Tamu
                </CardTitle>
                <CardDescription className="text-xs">
                  Aktivitas doa di dalam buku tamu digital
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-border/50 bg-muted/10 rounded-xl border p-4 text-center">
                    <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                      Total Ucapan
                    </span>
                    <span className="text-foreground mt-1.5 block font-mono text-3xl font-extrabold">
                      {safeStats.total_wishes}
                    </span>
                  </div>
                  <div className="border-border/50 bg-muted/10 rounded-xl border p-4 text-center">
                    <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                      Tampil (Visible)
                    </span>
                    <span className="text-success mt-1.5 block font-mono text-3xl font-extrabold">
                      {safeStats.visible_wishes}
                    </span>
                  </div>
                </div>

                <div className="text-muted-foreground text-center text-xs leading-relaxed italic">
                  &ldquo;
                  {safeStats.total_wishes > 0
                    ? `${Math.round((safeStats.visible_wishes / safeStats.total_wishes) * 100)}% doa dari tamu telah lolos moderasi untuk tampil di layar slideshow.`
                    : 'Belum ada pesan doa dari tamu.'}
                  &rdquo;
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Peak Check-in Hours */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-3 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                  <Clock className="text-primary h-4.5 w-4.5" />
                  Grafik Waktu Puncak Check-In Tamu
                </CardTitle>
                <CardDescription className="text-xs">
                  Frekuensi kedatangan tamu per 30-menit interval waktu (WIB)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {safeStats.checkin_peak.length > 0 ? (
                  <BarChart
                    data={safeStats.checkin_peak.map(
                      (slot: { timeSlot: string; count: number }) => ({
                        label: slot.timeSlot,
                        value: slot.count,
                        color: 'var(--color-primary)',
                      })
                    )}
                  />
                ) : (
                  <div className="text-muted-foreground bg-muted/10 flex h-[180px] items-center justify-center rounded-xl border border-dashed text-sm">
                    Menunggu tamu pertama melakukan check-in via QR / Manual...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}

// --- Skeleton Senders ---
function ChartsSkeletons() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-10 w-64 animate-pulse rounded-lg" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/40 bg-card h-[280px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
