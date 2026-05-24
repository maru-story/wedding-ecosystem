'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, EventStatus, type CreateEventInput } from '@wedding/shared';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      status: EventStatus.PUBLISHED,
      akad_start: '09:00',
      akad_end: '11:00',
      resepsi_start: '12:00',
      resepsi_end: '15:00',
      venue_maps_url: '',
    }
  });

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventInput) => apiFetch('/events', {
      method: 'POST',
      body: data
    }),
    onSuccess: () => {
      toast.success('Pernikahan Anda berhasil didaftarkan!');
      // Invalidate event query to trigger layout refresh
      queryClient.invalidateQueries({ queryKey: ['event'] });
      router.push('/');
    },
    onError: (error: any) => {
      toast.error(error.data?.error?.message || 'Gagal mendaftarkan pernikahan.');
    }
  });

  const onSubmit = (data: CreateEventInput) => {
    createEventMutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
          <Heart className="h-8 w-8 fill-current text-primary" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Selamat Datang!</h1>
        <p className="mt-2 text-muted-foreground">
          Mari siapkan informasi dasar pernikahan Anda untuk memulai undangan digital.
        </p>
      </div>

      <div className="rounded-2xl bg-card p-8 shadow-sm border border-border">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Pasangan */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="groom_name">Nama Mempelai Pria</Label>
              <Input
                id="groom_name"
                {...register('groom_name')}
                placeholder="Contoh: Romeo"
                className="bg-card px-4 py-2.5 h-11 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
              {errors.groom_name && <p className="text-xs text-destructive">{errors.groom_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bride_name">Nama Mempelai Wanita</Label>
              <Input
                id="bride_name"
                {...register('bride_name')}
                placeholder="Contoh: Juliet"
                className="bg-card px-4 py-2.5 h-11 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
              {errors.bride_name && <p className="text-xs text-destructive">{errors.bride_name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug Undangan (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/80 text-sm">undangan.com/</span>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="romeo-juliet"
                className="flex-1 bg-card px-4 py-2.5 h-11 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/75">Hanya huruf kecil, angka, dan tanda hubung.</p>
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Tanggal Acara</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
              <Input
                id="event_date"
                {...register('event_date')}
                type="date"
                className="bg-card pl-10 pr-4 py-2.5 h-11 text-foreground transition-all duration-200"
              />
            </div>
            {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_name">Nama Tempat (Venue)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
              <Input
                id="venue_name"
                {...register('venue_name')}
                placeholder="Contoh: Gedung Serbaguna ABC"
                className="bg-card pl-10 pr-4 py-2.5 h-11 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
            </div>
            {errors.venue_name && <p className="text-xs text-destructive">{errors.venue_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_address">Alamat Lengkap</Label>
            <Textarea
              id="venue_address"
              {...register('venue_address')}
              rows={3}
              placeholder="Jl. Raya No. 123, Kota..."
              className="bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
            />
            {errors.venue_address && <p className="text-xs text-destructive">{errors.venue_address.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={createEventMutation.isPending}
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 cursor-pointer"
          >
            {createEventMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Selesaikan Pendaftaran <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
