'use client';

import { Suspense } from 'react';
import { DashboardStats } from './components/dashboard-stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Users,
  Palette,
  QrCode,
  FileText,
  Mail,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { FadeIn } from '@/components/ui/motion-wrapper';

export default function HomePage() {
  const preparationSteps = [
    {
      title: 'Lengkapi Detail Undangan (CMS)',
      description: 'Atur info pengantin, acara akad/resepsi, galeri foto, kisah cinta, dan musik latar.',
      href: '/cms',
      status: 'completed',
      statusLabel: 'Selesai',
      badgeClass: 'bg-success/15 text-success border-success/30',
    },
    {
      title: 'Pilih & Kustomisasi Tema',
      description: 'Pilih skema warna premium (Sage Green, Copper, Cream) yang mewakili identitas Anda.',
      href: '/theme',
      status: 'completed',
      statusLabel: 'Selesai',
      badgeClass: 'bg-success/15 text-success border-success/30',
    },
    {
      title: 'Impor / Tambah Daftar Tamu',
      description: 'Tambahkan tamu undangan satu per satu atau impor dari file CSV.',
      href: '/guests',
      status: 'completed',
      statusLabel: 'Selesai',
      badgeClass: 'bg-success/15 text-success border-success/30',
    },
    {
      title: 'Distribusi Undangan & Pantau RSVP',
      description: 'Bagikan tautan undangan personal dan pantau respon kehadiran secara real-time.',
      href: '/rsvp',
      status: 'current',
      statusLabel: 'Sedang Berjalan',
      badgeClass: 'bg-info/15 text-info border-info/30',
    },
    {
      title: 'Scan QR Kehadiran (Hari-H)',
      description: 'Gunakan aplikasi scanner untuk mempercepat check-in dan mencegah duplikasi.',
      href: '/scanner',
      status: 'upcoming',
      statusLabel: 'Siap',
      badgeClass: 'bg-primary/15 text-primary border-primary/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards Section */}
      <div className="space-y-3">
        <FadeIn delay={0.05}>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Statistik Acara Saat Ini</h2>
        </FadeIn>
        <Suspense fallback={<StatsSkeletons />}>
          <DashboardStats />
        </Suspense>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left Span: Preparation Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <FadeIn delay={0.1}>
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="font-heading text-xl font-bold">Panduan Langkah Persiapan</CardTitle>
                    <CardDescription className="mt-1">
                      Ikuti langkah-langih berikut untuk memastikan undangan digital Anda siap
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-semibold px-2.5 py-1">
                    Kemajuan: 60%
                  </Badge>
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-4 h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-primary transition-all duration-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative border-l border-border/80 pl-6 ml-3 space-y-8">
                  {preparationSteps.map((step, idx) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';

                    return (
                      <div key={idx} className="relative group">
                        {/* Status Icon Indicator */}
                        <span className={`absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200 ${isCompleted
                            ? 'bg-primary border-primary text-primary-foreground'
                            : isCurrent
                              ? 'bg-background border-ring text-ring ring-4 ring-ring/10 animate-pulse'
                              : 'bg-background border-border text-muted-foreground'
                          }`}>
                          {isCompleted ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </span>

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className={`font-semibold text-base transition-colors ${isCompleted ? 'text-muted-foreground line-through decoration-muted-foreground/30' : 'text-foreground'
                                }`}>
                                {step.title}
                              </h3>
                              <Badge variant="outline" className={`${step.badgeClass} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                                {step.statusLabel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                          <Link
                            href={step.href}
                            className={`${buttonVariants({
                              variant: isCurrent ? 'default' : 'outline',
                              size: 'sm'
                            })} border-border/60 hover:bg-accent text-sm transition-all duration-200 cursor-pointer ${isCurrent
                                ? 'bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            Atur
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Right Span: Quick Actions & Domain Rules */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <FadeIn delay={0.15}>
            <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
                <CardTitle className="font-heading text-lg font-bold">Aksi Cepat</CardTitle>
                <CardDescription>Pintas akses ke halaman manajemen utama</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {[
                  { label: 'Kelola Tamu', href: '/guests', icon: Users, desc: 'Lihat & tambah data tamu', color: 'bg-primary/10 text-primary' },
                  { label: 'Tracking RSVP', href: '/rsvp', icon: Mail, desc: 'Pantau respon kehadiran', color: 'bg-ring/10 text-ring' },
                  { label: 'Desain Tema', href: '/theme', icon: Palette, desc: 'Pilih tema & warna kustom', color: 'bg-accent/20 text-accent-foreground' },
                  { label: 'Scan QR Kehadiran', href: '/scanner', icon: QrCode, desc: 'Buka pemindai kehadiran', color: 'bg-success/10 text-success' },
                  { label: 'Edit Konten', href: '/cms', icon: FileText, desc: 'Sesuaikan detail undangan', color: 'bg-info/10 text-info' },
                ].map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <Link key={i} href={action.href} className="group flex items-center justify-between rounded-xl p-3 border border-transparent hover:border-border/50 hover:bg-accent/30 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2.5 ${action.color} border border-transparent group-hover:scale-105 transition-transform duration-200`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.desc}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </FadeIn>

          {/* System Rules Guidelines Card */}
          <FadeIn delay={0.2}>
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-ring">
                  <ShieldCheck className="h-5 w-5" />
                  <CardTitle className="font-heading text-base font-bold">Pedoman & Batasan Acara</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ring/10 text-[10px] font-bold text-ring border border-ring/25">1</span>
                  <div>
                    <strong className="text-foreground">Maksimal 2 Perangkat Scanner:</strong> Setiap acara dibatasi untuk maksimal 2 perangkat scanner aktif secara bersamaan demi keamanan data.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ring/10 text-[10px] font-bold text-ring border border-ring/25">2</span>
                  <div>
                    <strong className="text-foreground">Pencegahan Check-in Ganda:</strong> Pemindaian ulang QR Code yang sama akan memicu status <span className="text-yellow-600 font-semibold bg-yellow-50 px-1 rounded border border-yellow-100">Kuning (Peringatan)</span> dan tidak menimpa data awal.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ring/10 text-[10px] font-bold text-ring border border-ring/25">3</span>
                  <div>
                    <strong className="text-foreground">Kapasitas Maksimal Tamu:</strong> Batas kapasitas tamu terdaftar di sistem adalah 2.000 tamu per event.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ring/10 text-[10px] font-bold text-ring border border-ring/25">4</span>
                  <div>
                    <strong className="text-foreground">Sinkronisasi Server Prioritas:</strong> Scanner PWA mendukung mode offline menggunakan IndexedDB, dan jika ada konflik saat sinkronisasi, data server adalah prioritas utama.
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

      </div>
    </div>
  );
}

function StatsSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/40 h-[120px] animate-pulse bg-card" />
      ))}
    </div>
  );
}
