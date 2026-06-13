'use client';

import { useState, useEffect } from 'react';
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
import { Heart, Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { useEvent } from '@/hooks/queries';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const { data: event, isLoading: eventLoading } = useEvent();

  useEffect(() => {
    if (!eventLoading && event) {
      router.replace('/');
    }
  }, [event, eventLoading, router]);

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
    },
  });

  const [invitationPrefix, setInvitationPrefix] = useState('undangan.com/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        setInvitationPrefix('localhost:3001/');
      } else if (host.includes('dashboard')) {
        setInvitationPrefix(host.replace('dashboard', 'invitation') + '/');
      } else {
        setInvitationPrefix('invitation.wedding-ecosystem.com/');
      }
    }
  }, []);

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventInput) =>
      apiFetch('/events', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      toast.success('Pernikahan Anda berhasil didaftarkan!');
      // Invalidate event query to trigger layout refresh
      queryClient.invalidateQueries({ queryKey: ['event'] });
      router.push('/');
    },
    onError: (error: any) => {
      toast.error(error.data?.error?.message || 'Gagal mendaftarkan pernikahan.');
    },
  });

  const onSubmit = (data: CreateEventInput) => {
    createEventMutation.mutate(data);
  };

  if (eventLoading || event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-fade-in text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="animate-fade-in mb-8 text-center">
        <div className="bg-primary/10 text-primary ring-primary/5 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ring-8">
          <Heart className="text-primary h-8 w-8 fill-current" />
        </div>
        <h1 className="font-heading text-foreground text-3xl font-bold">Selamat Datang!</h1>
        <p className="text-muted-foreground mt-2">
          Mari siapkan informasi dasar pernikahan Anda untuk memulai undangan digital.
        </p>
      </div>

      <div className="bg-card border-border rounded-2xl border p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Pasangan */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="groom_name">Nama Mempelai Pria</Label>
              <Input
                id="groom_name"
                {...register('groom_name')}
                placeholder="Contoh: Romeo"
                className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
              />
              {errors.groom_name && (
                <p className="text-destructive text-xs">{errors.groom_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bride_name">Nama Mempelai Wanita</Label>
              <Input
                id="bride_name"
                {...register('bride_name')}
                placeholder="Contoh: Juliet"
                className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
              />
              {errors.bride_name && (
                <p className="text-destructive text-xs">{errors.bride_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug Undangan (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/80 text-sm">{invitationPrefix}</span>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="romeo-juliet"
                className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 flex-1 px-4 py-2.5 transition-all duration-200"
              />
            </div>
            <p className="text-muted-foreground/75 text-[10px]">
              Hanya huruf kecil, angka, dan tanda hubung.
            </p>
            {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Tanggal Acara</Label>
            <div className="relative">
              <Calendar className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
              <Input
                id="event_date"
                {...register('event_date')}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
              />
            </div>
            {errors.event_date && (
              <p className="text-destructive text-xs">{errors.event_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_name">Nama Tempat (Venue)</Label>
            <div className="relative">
              <MapPin className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
              <Input
                id="venue_name"
                {...register('venue_name')}
                placeholder="Contoh: Gedung Serbaguna ABC"
                className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
              />
            </div>
            {errors.venue_name && (
              <p className="text-destructive text-xs">{errors.venue_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_address">Alamat Lengkap</Label>
            <Textarea
              id="venue_address"
              {...register('venue_address')}
              rows={3}
              placeholder="Jl. Raya No. 123, Kota..."
              className="bg-card text-foreground placeholder:text-muted-foreground/60 px-4 py-2.5 transition-all duration-200"
            />
            {errors.venue_address && (
              <p className="text-destructive text-xs">{errors.venue_address.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={createEventMutation.isPending}
            className="shadow-primary/20 h-12 w-full cursor-pointer text-base font-semibold shadow-lg transition-all duration-200"
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
