'use client';

import { useDashboardStats } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail, CheckCircle2, UserPlus, ArrowUpRight } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/ui/motion-wrapper';

export function DashboardStats() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <StatsSkeletons />;
  
  // Provide fallback values if error or no data
  const safeStats = stats || {
    total_guests: 0,
    total_rsvp: 0,
    total_checked_in: 0,
    total_go_show: 0,
  };

  const cards = [
    {
      label: 'Total Tamu',
      value: safeStats.total_guests,
      icon: Users,
      colorClass: 'bg-primary/10 text-primary border-primary/20',
      description: 'Jumlah tamu terdaftar di sistem',
    },
    {
      label: 'RSVP Masuk',
      value: safeStats.total_rsvp,
      icon: Mail,
      colorClass: 'bg-ring/10 text-ring border-ring/20',
      description: 'Tamu yang telah konfirmasi hadir',
    },
    {
      label: 'Sudah Check-in',
      value: safeStats.total_checked_in,
      icon: CheckCircle2,
      colorClass: 'bg-success/10 text-success border-success/20',
      description: 'Tamu yang sudah memindai QR',
    },
    {
      label: 'Go-Show (Walk-in)',
      value: safeStats.total_go_show,
      icon: UserPlus,
      colorClass: 'bg-accent/20 text-accent-foreground border-accent/30',
      description: 'Tamu go-show terdaftar on-site',
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <StaggerItem key={index}>
            <Card className="h-full border-border/60 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {card.value.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3.5 ${card.colorClass} border transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5 text-ring/80" />
                  <span>{card.description}</span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
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
