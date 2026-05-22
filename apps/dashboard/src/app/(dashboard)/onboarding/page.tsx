'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, type CreateEventInput } from '@wedding/shared';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Heart, 
  Calendar, 
  MapPin, 
  Clock, 
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
    watch,
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      status: 'published',
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="h-8 w-8 fill-current" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Selamat Datang!</h1>
        <p className="mt-2 text-gray-600">
          Mari siapkan informasi dasar pernikahan Anda untuk memulai.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Pasangan */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nama Mempelai Pria</label>
              <input
                {...register('groom_name')}
                placeholder="Contoh: Romeo"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.groom_name && <p className="text-xs text-red-500">{errors.groom_name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nama Mempelai Wanita</label>
              <input
                {...register('bride_name')}
                placeholder="Contoh: Juliet"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.bride_name && <p className="text-xs text-red-500">{errors.bride_name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug Undangan (URL)</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">undangan.com/</span>
              <input
                {...register('slug')}
                placeholder="romeo-juliet"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-[10px] text-gray-400">Hanya huruf kecil, angka, dan tanda hubung.</p>
            {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tanggal Acara</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                {...register('event_date')}
                type="date"
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {errors.event_date && <p className="text-xs text-red-500">{errors.event_date.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nama Tempat (Venue)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                {...register('venue_name')}
                placeholder="Contoh: Gedung Serbaguna ABC"
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {errors.venue_name && <p className="text-xs text-red-500">{errors.venue_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Alamat Lengkap</label>
            <textarea
              {...register('venue_address')}
              rows={3}
              placeholder="Jl. Raya No. 123, Kota..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.venue_address && <p className="text-xs text-red-500">{errors.venue_address.message}</p>}
          </div>

          <button
            type="submit"
            disabled={createEventMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-70"
          >
            {createEventMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Selesaikan Pendaftaran <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
