'use client';

import { Suspense } from 'react';
import { DashboardStats } from './components/dashboard-stats';
import { DashboardCharts } from './components/dashboard-charts';
import { Card } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/motion-wrapper';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <FadeIn delay={0.02}>
        <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Dashboard Klien</h1>
          <p className="text-sm text-muted-foreground">
            Ikhtisar data pernikahan dan analisis real-time seluruh aktivitas tamu undangan
          </p>
        </div>
      </FadeIn>

      {/* Stats Cards Section */}
      <Suspense fallback={<StatsSkeletons />}>
        <DashboardStats />
      </Suspense>

      {/* Visual Charts Dashboard Panel */}
      <Suspense fallback={<div className="h-[300px] animate-pulse bg-card rounded-2xl border border-border/40" />}>
        <DashboardCharts />
      </Suspense>
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
