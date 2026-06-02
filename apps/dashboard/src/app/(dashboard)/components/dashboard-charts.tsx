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
  Crown
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
      <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {total > 0 && data.map((item, index) => {
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
              className="transition-all duration-300 hover:opacity-85 cursor-pointer"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: '70px 70px',
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-foreground">{centerLabel !== undefined ? centerLabel : total}</span>
        {centerSublabel && <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">{centerSublabel}</span>}
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
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex w-full items-end justify-around px-2 pt-6" style={{ height: `${height}px` }}>
      {data.map((item, index) => {
        const heightPercentage = (item.value / maxVal) * 100;
        return (
          <div key={index} className="flex flex-col items-center group relative w-14">
            <div className="absolute -top-8 hidden group-hover:flex flex-col items-center bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded shadow-md z-10 whitespace-nowrap">
              <span>{item.value.toLocaleString('id-ID')}</span>
            </div>
            
            <div 
              style={{ 
                height: `${Math.max(heightPercentage, 6)}%`,
                backgroundColor: item.color,
                width: '1.5rem',
              }} 
              className="rounded-t-md transition-all duration-300 hover:opacity-90 cursor-pointer shadow-xs"
            />
            <span className="mt-2 text-[10px] font-semibold text-muted-foreground text-center truncate w-full">
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
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/10">
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

  const areaD = data.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <svg width={width} height={height} className="overflow-visible mx-auto">
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
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3,3" />
              <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[9px] fill-muted-foreground font-semibold font-mono">{val}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line stroke */}
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group/point relative">
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-background)" stroke="var(--color-primary)" strokeWidth="2" className="transition-all hover:r-6 cursor-pointer" />
            <title>{`${p.label}: ${p.value} RSVP`}</title>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.length > 0 && [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map((p, i) => {
          if (!p) return null;
          return (
            <text key={i} x={p.x} y={height - 2} textAnchor="middle" className="text-[9px] fill-muted-foreground font-semibold">
              {p.label}
            </text>
          );
        })}
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
  group_breakdown: Record<string, {
    total: number;
    confirmed: number;
    declined: number;
    pending: number;
    checked_in: number;
  }>;
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
    { label: 'Belum Datang', value: Math.max(safeStats.total_guests - safeStats.total_checked_in, 0), color: '#e5e7eb' },
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
        <div className="flex items-center justify-between border-b border-border pb-3">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="pre-event" className="font-semibold text-xs tracking-wider uppercase">
              Pra-Acara (Persiapan)
            </TabsTrigger>
            <TabsTrigger value="event-day" className="font-semibold text-xs tracking-wider uppercase">
              Hari-H (Pelaksanaan)
            </TabsTrigger>
          </TabsList>
          
          <Badge variant="outline" className="font-semibold font-mono text-[10px] text-muted-foreground uppercase border-border">
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
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                  Konfirmasi Kehadiran Tamu
                </CardTitle>
                <CardDescription className="text-xs">Rasio respon undangan oleh tamu</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart 
                  data={rsvpDonutData} 
                  centerLabel={`${Math.round(((safeStats.rsvp_confirmed + safeStats.rsvp_declined) / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Respon"
                />
                
                {/* Legends */}
                <div className="mt-5 grid grid-cols-3 gap-4 w-full text-center border-t border-border/40 pt-4">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-success mr-1.5" />
                    <span className="text-[10px] font-semibold text-muted-foreground block md:inline">Hadir</span>
                    <p className="text-sm font-extrabold font-mono mt-0.5">{safeStats.rsvp_confirmed}</p>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive mr-1.5" />
                    <span className="text-[10px] font-semibold text-muted-foreground block md:inline">Menolak</span>
                    <p className="text-sm font-extrabold font-mono mt-0.5">{safeStats.rsvp_declined}</p>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 mr-1.5" />
                    <span className="text-[10px] font-semibold text-muted-foreground block md:inline">Pending</span>
                    <p className="text-sm font-extrabold font-mono mt-0.5">{safeStats.rsvp_pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Pax Catering Stats */}
            <Card className="border-border/60 bg-card shadow-xs flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Estimasi Porsi Makanan (Pax)
                </CardTitle>
                <CardDescription className="text-xs">Prediksi kuantitas porsi catering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 text-center flex flex-col items-center">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total Estimasi Pax Hadir</span>
                  <span className="text-4xl font-extrabold text-primary font-mono mt-1.5">{safeStats.total_pax_confirmed}</span>
                  <span className="text-[10px] text-muted-foreground mt-1.5">Penjumlahan pax riil RSVP konfirmasi</span>
                </div>
                
                {/* Comparison progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Rasio Pax Hadir vs Total Terundang</span>
                    <span className="font-mono">{safeStats.total_pax_confirmed} / {safeStats.total_pax_invited} Pax</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((safeStats.total_pax_confirmed / Math.max(safeStats.total_pax_invited, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Session Distribution */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Clock className="h-4.5 w-4.5 text-info" />
                  Distribusi Kehadiran Sesi
                </CardTitle>
                <CardDescription className="text-xs">Jumlah tamu pada masing-masing sesi</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <BarChart data={rsvpSessionData} />
              </CardContent>
            </Card>

            {/* Card 4: WhatsApp Invitation Delivery */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Send className="h-4.5 w-4.5 text-emerald-500" />
                  Progress Pengiriman Undangan
                </CardTitle>
                <CardDescription className="text-xs">Tamu yang sudah dikirimi pesan WA</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart 
                  data={deliveryData} 
                  centerLabel={`${Math.round((safeStats.delivery_sent / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Terkirim"
                />
                
                {/* Legends */}
                <div className="mt-5 grid grid-cols-3 gap-2 w-full text-center border-t border-border/40 pt-4 text-[10px]">
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#25D366] mr-1" />
                    <span className="text-muted-foreground block font-semibold">Terkirim</span>
                    <p className="text-xs font-extrabold font-mono mt-0.5">{safeStats.delivery_sent}</p>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />
                    <span className="text-muted-foreground block font-semibold">Belum</span>
                    <p className="text-xs font-extrabold font-mono mt-0.5">{safeStats.delivery_not_sent}</p>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />
                    <span className="text-muted-foreground block font-semibold">Gagal</span>
                    <p className="text-xs font-extrabold font-mono mt-0.5">{safeStats.delivery_failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: RSVP Timeline Trend */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  Tren Kecepatan RSVP Tamu (Akumulatif)
                </CardTitle>
                <CardDescription className="text-xs">Kecepatan tamu dalam memberikan konfirmasi</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <LineChart data={safeStats.rsvp_trend.map(t => ({ label: t.date, value: t.count }))} />
              </CardContent>
            </Card>

            {/* Card 6: Guest Distribution by Group */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Rasio Kehadiran Berdasarkan Grup Relasi</CardTitle>
                <CardDescription className="text-xs">Perbandingan status konfirmasi per kategori relasi</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(safeStats.group_breakdown).map(([group, groupStats]: [string, any]) => {
                    const pct = Math.round((groupStats.confirmed / Math.max(groupStats.total, 1)) * 100);
                    return (
                      <div key={group} className="border border-border/50 rounded-xl p-4 bg-muted/10 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                            {groupLabelMap[group] || group}
                          </span>
                          <Badge variant="secondary" className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {groupStats.total} Tamu
                          </Badge>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                            <span>RSVP Hadir:</span>
                            <span className="font-mono text-success">{groupStats.confirmed} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div 
                              className="h-full bg-success rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[9px] text-center text-muted-foreground pt-1 border-t border-border/30">
                          <div>
                            <span className="block font-bold font-mono text-xs text-foreground">{groupStats.confirmed}</span>
                            <span>Hadir</span>
                          </div>
                          <div>
                            <span className="block font-bold font-mono text-xs text-foreground">{groupStats.declined}</span>
                            <span>Tolak</span>
                          </div>
                          <div>
                            <span className="block font-bold font-mono text-xs text-foreground">{groupStats.pending}</span>
                            <span>Pending</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <UserCheck className="h-4.5 w-4.5 text-success" />
                  Rasio Kehadiran Venue (Hari-H)
                </CardTitle>
                <CardDescription className="text-xs">Persentase kedatangan tamu di lokasi</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-4">
                <DonutChart 
                  data={checkinData} 
                  centerLabel={`${Math.round((safeStats.total_checked_in / Math.max(safeStats.total_guests, 1)) * 100)}%`}
                  centerSublabel="Tiba"
                />
                
                {/* Legends */}
                <div className="mt-5 grid grid-cols-2 gap-4 w-full text-center border-t border-border/40 pt-4">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-success mr-1.5" />
                    <span className="text-[10px] font-semibold text-muted-foreground block md:inline">Sudah Datang</span>
                    <p className="text-sm font-extrabold font-mono mt-0.5">{safeStats.total_checked_in}</p>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 mr-1.5" />
                    <span className="text-[10px] font-semibold text-muted-foreground block md:inline">Belum Datang</span>
                    <p className="text-sm font-extrabold font-mono mt-0.5">{Math.max(safeStats.total_guests - safeStats.total_checked_in, 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: VIP Attendance Ring */}
            <Card className="border-border/60 bg-card shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Crown className="h-4.5 w-4.5 text-amber-500" />
                  Monitoring Tamu VIP
                </CardTitle>
                <CardDescription className="text-xs">Kehadiran khusus tamu VIP terdaftar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="bg-amber-500/5 rounded-xl border border-amber-500/10 p-5 text-center flex flex-col items-center">
                  <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">VIP Sudah Tiba di Venue</span>
                  <span className="text-4xl font-extrabold text-amber-600 font-mono mt-1.5">
                    {safeStats.vip_checked_in} <span className="text-lg text-muted-foreground">/ {safeStats.vip_total}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1.5">Tamu penting terdaftar dengan tag VIP</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Persentase Kehadiran VIP</span>
                    <span className="font-mono text-amber-600">
                      {safeStats.vip_total > 0 ? Math.round((safeStats.vip_checked_in / safeStats.vip_total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                      style={{ width: `${safeStats.vip_total > 0 ? (safeStats.vip_checked_in / safeStats.vip_total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Wishes sentiment */}
            <Card className="border-border/60 bg-card shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Heart className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  Pesan Ucapan & Doa Tamu
                </CardTitle>
                <CardDescription className="text-xs">Aktivitas doa di dalam buku tamu digital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/10 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Ucapan</span>
                    <span className="text-3xl font-extrabold font-mono text-foreground mt-1.5 block">{safeStats.total_wishes}</span>
                  </div>
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/10 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Tampil (Visible)</span>
                    <span className="text-3xl font-extrabold font-mono text-success mt-1.5 block">{safeStats.visible_wishes}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed text-center italic">
                  &ldquo;{safeStats.total_wishes > 0 ? `${Math.round((safeStats.visible_wishes / safeStats.total_wishes) * 100)}% doa dari tamu telah lolos moderasi untuk tampil di layar slideshow.` : 'Belum ada pesan doa dari tamu.'}&rdquo;
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Peak Check-in Hours */}
            <Card className="border-border/60 bg-card shadow-xs md:col-span-3 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                  Grafik Waktu Puncak Check-In Tamu
                </CardTitle>
                <CardDescription className="text-xs">Frekuensi kedatangan tamu per 30-menit interval waktu (WIB)</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {safeStats.checkin_peak.length > 0 ? (
                  <BarChart data={safeStats.checkin_peak.map((slot: { timeSlot: string; count: number }) => ({
                    label: slot.timeSlot,
                    value: slot.count,
                    color: 'var(--color-primary)'
                  }))} />
                ) : (
                  <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/10">
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
      <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/40 h-[280px] animate-pulse bg-card" />
        ))}
      </div>
    </div>
  );
}
