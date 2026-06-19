'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateEventSchema,
  type UpdateEventInput,
  updateProfileSchema,
  type UpdateProfileInput,
  changePasswordSchema,
  type ChangePasswordInput,
} from '@wedding/shared';
import { apiFetch } from '@/lib/api';
import { useEvent } from '@/hooks/queries';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  MapPin,
  Clock,
  Link2,
  Heart,
  Loader2,
  Save,
  User,
  Lock,
  Shield,
  FileImage,
} from 'lucide-react';
import { FadeIn } from '@/components/ui/motion-wrapper';
import { CustomTabs } from '@/components/ui/custom-tabs';
import { uploadMedia } from '@/lib/cms';
import { MediaUpload } from '@/components/cms/media-upload';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: event, isLoading: eventLoading } = useEvent();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'event' | 'seo' | 'account'>('event');

  // --- Form 1: Event Settings ---
  const {
    register: registerEvent,
    handleSubmit: handleSubmitEvent,
    reset: resetEvent,
    formState: { errors: errorsEvent },
  } = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
  });

  const invitationPrefix = process.env.NEXT_PUBLIC_INVITATION_URL;

  useEffect(() => {
    if (event) {
      const formattedDate = event.event_date
        ? new Date(event.event_date).toISOString().split('T')[0]
        : '';

      resetEvent({
        slug: event.slug,
        bride_name: event.bride_name,
        groom_name: event.groom_name,
        event_date: formattedDate,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        venue_maps_url: event.venue_maps_url || '',
        akad_start: event.akad_start || '09:00',
        akad_end: event.akad_end || '11:00',
        resepsi_start: event.resepsi_start || '12:00',
        resepsi_end: event.resepsi_end || '15:00',
      });
    }
  }, [event, resetEvent]);

  const updateEventMutation = useMutation({
    mutationFn: (data: UpdateEventInput) =>
      apiFetch(`/events/${event!.id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      toast.success('Pengaturan pernikahan berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['event'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      // Purge invitation cache after event update
      if (event?.slug) {
        fetch(`${process.env.NEXT_PUBLIC_INVITATION_URL}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventSlug: event.slug,
            secret: process.env.NEXT_PUBLIC_REVALIDATION_SECRET,
          }),
        }).catch((e) => console.warn('Revalidation failed:', e));
      }
    },
    onError: (error: any) => {
      toast.error(error.data?.error?.message || 'Gagal menyimpan pengaturan.');
    },
  });

  const onSubmitEvent = (data: UpdateEventInput) => {
    updateEventMutation.mutate(data);
  };

  // --- Form 2: Profile Settings ---
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: errorsProfile },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email,
        username: user.username || '',
      });
    }
  }, [user, resetProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<{ success: boolean; data: any }>('/auth/profile', {
        method: 'PUT',
        body: data,
      }),
    onSuccess: (res) => {
      toast.success('Profil berhasil diperbarui!');
      if (res.data) {
        updateUser(res.data);
      }
    },
    onError: (error: any) => {
      toast.error(error.data?.error?.message || 'Gagal memperbarui profil.');
    },
  });

  const onSubmitProfile = (data: UpdateProfileInput) => {
    updateProfileMutation.mutate(data);
  };

  // --- Form 3: Password Settings ---
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: errorsPassword },
  } = useForm<ChangePasswordInput & { confirm_password?: string }>({
    resolver: zodResolver(changePasswordSchema),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiFetch('/auth/change-password', {
        method: 'PUT',
        body: {
          current_password: data.current_password,
          new_password: data.new_password,
        },
      }),
    onSuccess: () => {
      toast.success('Password berhasil diubah!');
      resetPassword({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.data?.error?.message || 'Gagal mengubah password.');
    },
  });

  const watchNewPassword = watchPassword('new_password');
  const watchConfirmPassword = watchPassword('confirm_password');

  const onSubmitPassword = (data: ChangePasswordInput) => {
    if (watchNewPassword !== watchConfirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok.');
      return;
    }
    updatePasswordMutation.mutate(data);
  };

  // --- Form 4: SEO & Share Preview Settings ---
  const {
    register: registerSEO,
    handleSubmit: handleSubmitSEO,
    setValue: setValueSEO,
    watch: watchSEO,
    reset: resetSEO,
    formState: { errors: errorsSEO },
  } = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
  });

  useEffect(() => {
    if (event) {
      resetSEO({
        share_title: event.share_title || '',
        share_description: event.share_description || '',
        share_image_url: event.share_image_url || '',
      });
    }
  }, [event, resetSEO]);

  const onSubmitSEO = (data: UpdateEventInput) => {
    updateEventMutation.mutate({
      share_title: data.share_title || null,
      share_description: data.share_description || null,
      share_image_url: data.share_image_url || null,
    });
  };

  if (eventLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-4 text-center">
        <div>
          <p className="text-destructive font-semibold">Gagal memuat detail acara</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Event tidak ditemukan untuk akun ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FadeIn delay={0.05}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Pengaturan
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Kelola informasi acara pernikahan dan pengaturan akun Anda.
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Custom Tabs Navigation Component */}
      <CustomTabs
        tabs={[
          { value: 'event', label: 'Pengaturan Acara' },
          { value: 'seo', label: 'Share & SEO' },
          { value: 'account', label: 'Pengaturan Akun' },
        ]}
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as 'event' | 'seo' | 'account')}
      />

      {/* Tab Content: Event Configuration */}
      {activeTab === 'event' && (
        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmitEvent(onSubmitEvent)} className="space-y-8">
            <div className="flex flex-col gap-6 sm:gap-8">
              {/* Mempelai */}
              <Card className="border-border/60 bg-card shadow-sm">
                <CardHeader className="border-border/40 border-b pb-4">
                  <div className="text-primary flex items-center gap-2">
                    <Heart className="h-5 w-5 fill-current" />
                    <CardTitle className="font-heading text-lg font-bold">
                      Informasi Pasangan Pengantin
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Ubah nama mempelai dan URL akses undangan digital Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="groom_name">Nama Mempelai Pria</Label>
                    <Input
                      id="groom_name"
                      {...registerEvent('groom_name')}
                      placeholder="Contoh: Romeo"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsEvent.groom_name && (
                      <p className="text-destructive text-xs">{errorsEvent.groom_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bride_name">Nama Mempelai Wanita</Label>
                    <Input
                      id="bride_name"
                      {...registerEvent('bride_name')}
                      placeholder="Contoh: Juliet"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsEvent.bride_name && (
                      <p className="text-destructive text-xs">{errorsEvent.bride_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="slug">Slug Undangan (URL)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/80 hidden text-sm sm:inline">
                        {invitationPrefix}
                      </span>
                      <Input
                        id="slug"
                        {...registerEvent('slug')}
                        placeholder="romeo-juliet"
                        className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 flex-1 px-4 py-2.5 transition-all duration-200"
                      />
                    </div>
                    <p className="text-muted-foreground/75 text-[10px]">
                      Hanya huruf kecil, angka, dan tanda hubung. Perubahan URL akan merubah alamat
                      akses undangan tamu Anda.
                    </p>
                    {errorsEvent.slug && (
                      <p className="text-destructive text-xs">{errorsEvent.slug.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tanggal & Waktu */}
              <Card className="border-border/60 bg-card shadow-sm">
                <CardHeader className="border-border/40 border-b pb-4">
                  <div className="text-primary flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <CardTitle className="font-heading text-lg font-bold">
                      Tanggal & Waktu
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Sesuaikan tanggal serta waktu pelaksanaan akad dan resepsi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="event_date">Tanggal Acara</Label>
                    <div className="relative">
                      <Calendar className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="event_date"
                        {...registerEvent('event_date')}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.event_date && (
                      <p className="text-destructive text-xs">{errorsEvent.event_date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="akad_start">Mulai Akad</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="akad_start"
                        {...registerEvent('akad_start')}
                        type="time"
                        className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.akad_start && (
                      <p className="text-destructive text-xs">{errorsEvent.akad_start.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="akad_end">Selesai Akad</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="akad_end"
                        {...registerEvent('akad_end')}
                        type="time"
                        className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.akad_end && (
                      <p className="text-destructive text-xs">{errorsEvent.akad_end.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resepsi_start">Mulai Resepsi</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="resepsi_start"
                        {...registerEvent('resepsi_start')}
                        type="time"
                        className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.resepsi_start && (
                      <p className="text-destructive text-xs">
                        {errorsEvent.resepsi_start.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resepsi_end">Selesai Resepsi</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="resepsi_end"
                        {...registerEvent('resepsi_end')}
                        type="time"
                        className="bg-card text-foreground h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.resepsi_end && (
                      <p className="text-destructive text-xs">{errorsEvent.resepsi_end.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lokasi */}
              <Card className="border-border/60 bg-card shadow-sm">
                <CardHeader className="border-border/40 border-b pb-4">
                  <div className="text-primary flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <CardTitle className="font-heading text-lg font-bold">Lokasi Acara</CardTitle>
                  </div>
                  <CardDescription>
                    Atur lokasi fisik acara dan integrasi peta digital.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="venue_name">Nama Tempat (Venue)</Label>
                    <div className="relative">
                      <MapPin className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="venue_name"
                        {...registerEvent('venue_name')}
                        placeholder="Contoh: Gedung Serbaguna ABC"
                        className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.venue_name && (
                      <p className="text-destructive text-xs">{errorsEvent.venue_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue_address">Alamat Lengkap</Label>
                    <Textarea
                      id="venue_address"
                      {...registerEvent('venue_address')}
                      rows={3}
                      placeholder="Jl. Raya No. 123, Kota..."
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsEvent.venue_address && (
                      <p className="text-destructive text-xs">
                        {errorsEvent.venue_address.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue_maps_url">Link Google Maps (Peta)</Label>
                    <div className="relative">
                      <Link2 className="text-muted-foreground/70 absolute top-3 left-3 h-5 w-5" />
                      <Input
                        id="venue_maps_url"
                        {...registerEvent('venue_maps_url')}
                        placeholder="https://maps.google.com/?q=..."
                        className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 py-2.5 pr-4 pl-10 transition-all duration-200"
                      />
                    </div>
                    {errorsEvent.venue_maps_url && (
                      <p className="text-destructive text-xs">
                        {errorsEvent.venue_maps_url.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Simpan Acara */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateEventMutation.isPending}
                className="shadow-primary/20 h-12 min-w-[150px] cursor-pointer px-6 text-base font-semibold shadow-lg transition-all duration-200"
              >
                {updateEventMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        </FadeIn>
      )}

      {/* Tab Content: SEO & Share Configuration */}
      {activeTab === 'seo' && (
        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmitSEO(onSubmitSEO)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Left 2 columns: Inputs */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-border/60 bg-card shadow-sm">
                  <CardHeader className="border-border/40 border-b pb-4">
                    <div className="text-primary flex items-center gap-2">
                      <FileImage className="h-5 w-5" />
                      <CardTitle className="font-heading text-lg font-bold">
                        Pengaturan Tampilan Share & SEO
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Atur judul, deskripsi, dan gambar pratinjau yang akan muncul saat link
                      undangan dibagikan ke media sosial atau aplikasi chatting (WhatsApp, Telegram,
                      Facebook, dll).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="share_title">Judul Share (Share Title)</Label>
                      <Input
                        id="share_title"
                        {...registerSEO('share_title')}
                        placeholder="Contoh: Undangan Pernikahan Romeo & Juliet"
                        className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                      />
                      <p className="text-muted-foreground/75 text-[10px]">
                        Disarankan di bawah 60 karakter agar tidak terpotong di media sosial.
                      </p>
                      {errorsSEO.share_title && (
                        <p className="text-destructive text-xs">{errorsSEO.share_title.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="share_description">Deskripsi Share (Share Description)</Label>
                      <Textarea
                        id="share_description"
                        {...registerSEO('share_description')}
                        rows={4}
                        placeholder="Contoh: Tanpa mengurangi rasa hormat, kami mengundang Anda untuk menghadiri acara pernikahan kami..."
                        className="bg-card text-foreground placeholder:text-muted-foreground/60 px-4 py-2.5 transition-all duration-200"
                      />
                      <p className="text-muted-foreground/75 text-[10px]">
                        Disarankan di bawah 150 karakter untuk deskripsi share yang optimal.
                      </p>
                      {errorsSEO.share_description && (
                        <p className="text-destructive text-xs">
                          {errorsSEO.share_description.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Gambar Pratinjau (Share Image/Thumbnail)</Label>
                      <MediaUpload
                        mediaType="image"
                        currentUrl={watchSEO('share_image_url') || undefined}
                        onUpload={async (file) => {
                          const result = await uploadMedia(event.id, file, 'seo');
                          setValueSEO('share_image_url', result.url, { shouldDirty: true });
                          return result.url;
                        }}
                        onRemove={() => {
                          setValueSEO('share_image_url', '', { shouldDirty: true });
                        }}
                      />
                      <p className="text-muted-foreground/75 text-[10px]">
                        Rekomendasi rasio 1.91:1 (misalnya 1200x630 pixel) agar pratinjau tampil
                        penuh dan proporsional di WhatsApp/Facebook.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column: Interactive preview */}
              <div className="space-y-6">
                <Card className="border-border/60 bg-card shadow-sm sticky top-6">
                  <CardHeader className="border-border/40 border-b pb-4">
                    <CardTitle className="font-heading text-base font-bold">
                      Simulasi Tampilan WhatsApp
                    </CardTitle>
                    <CardDescription>
                      Perkiraan bagaimana link undangan Anda akan terlihat saat dibagikan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Simulated Chat bubble */}
                    <div className="bg-[#E7F3EF] dark:bg-[#0B141A] rounded-lg p-3 text-sm shadow-sm border border-[#D1E7DF] dark:border-[#222E35]">
                      {/* Link message bubble */}
                      <div className="bg-[#FFFFFF] dark:bg-[#1F2C34] rounded-lg overflow-hidden border border-border/40 max-w-[280px] mx-auto shadow-sm">
                        {/* Share Image Preview */}
                        <div className="relative aspect-[1.91/1] bg-muted flex items-center justify-center border-b border-border/30 overflow-hidden">
                          {watchSEO('share_image_url') ? (
                            <img
                              src={watchSEO('share_image_url')!}
                              alt="Share preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-4">
                              <FileImage className="h-8 w-8 mb-1" />
                              <span className="text-[10px]">Belum ada gambar</span>
                            </div>
                          )}
                        </div>
                        {/* Info details */}
                        <div className="p-3 bg-[#F0F2F5] dark:bg-[#202C33] space-y-1">
                          <div className="font-semibold text-foreground text-xs truncate">
                            {watchSEO('share_title') || 'Undangan Pernikahan'}
                          </div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {watchSEO('share_description') ||
                              'Klik link untuk melihat detail acara pernikahan kami.'}
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 uppercase tracking-wider font-medium pt-1">
                            {invitationPrefix}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-muted-foreground mt-1">12.00</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Simpan SEO */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateEventMutation.isPending}
                className="shadow-primary/20 h-12 min-w-[150px] cursor-pointer px-6 text-base font-semibold shadow-lg transition-all duration-200"
              >
                {updateEventMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Simpan SEO
                  </>
                )}
              </Button>
            </div>
          </form>
        </FadeIn>
      )}

      {/* Tab Content: Account Configuration */}
      {activeTab === 'account' && (
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Ubah Profil */}
            <Card className="border-border/60 bg-card h-full shadow-sm">
              <CardHeader className="border-border/40 border-b pb-4">
                <div className="text-primary flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle className="font-heading text-lg font-bold">Ubah Profil</CardTitle>
                </div>
                <CardDescription>Perbarui nama lengkap dan alamat email Anda.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="profile_name">Nama Lengkap</Label>
                    <Input
                      id="profile_name"
                      {...registerProfile('name')}
                      placeholder="Contoh: Romeo Montague"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsProfile.name && (
                      <p className="text-destructive text-xs">{errorsProfile.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile_email">Alamat Email</Label>
                    <Input
                      id="profile_email"
                      {...registerProfile('email')}
                      type="email"
                      placeholder="romeo@example.com"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsProfile.email && (
                      <p className="text-destructive text-xs">{errorsProfile.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile_username">Username</Label>
                    <Input
                      id="profile_username"
                      {...registerProfile('username')}
                      placeholder="superadmin"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsProfile.username && (
                      <p className="text-destructive text-xs">{errorsProfile.username.message}</p>
                    )}
                  </div>
                </CardContent>
                <div className="flex justify-end p-6 pt-0">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="h-11 cursor-pointer px-6 text-sm font-semibold shadow-md transition-all duration-200"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Profil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
            {/* Ganti Password */}
            <Card className="border-border/60 bg-card h-full shadow-sm">
              <CardHeader className="border-border/40 border-b pb-4">
                <div className="text-primary flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle className="font-heading text-lg font-bold">Ganti Password</CardTitle>
                </div>
                <CardDescription>Ganti password Anda untuk menjaga keamanan akun.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Password Saat Ini</Label>
                    <Input
                      id="current_password"
                      {...registerPassword('current_password')}
                      type="password"
                      placeholder="••••••••"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsPassword.current_password && (
                      <p className="text-destructive text-xs">
                        {errorsPassword.current_password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">Password Baru</Label>
                    <Input
                      id="new_password"
                      {...registerPassword('new_password')}
                      type="password"
                      placeholder="••••••••"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {errorsPassword.new_password && (
                      <p className="text-destructive text-xs">
                        {errorsPassword.new_password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirm_password"
                      {...registerPassword('confirm_password')}
                      type="password"
                      placeholder="••••••••"
                      className="bg-card text-foreground placeholder:text-muted-foreground/60 h-11 px-4 py-2.5 transition-all duration-200"
                    />
                    {watchNewPassword &&
                      watchConfirmPassword &&
                      watchNewPassword !== watchConfirmPassword && (
                        <p className="text-destructive text-xs">
                          Konfirmasi password baru tidak cocok
                        </p>
                      )}
                  </div>
                </CardContent>
                <div className="flex justify-end p-6 pb-0">
                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="h-11 cursor-pointer px-6 text-sm font-semibold shadow-md transition-all duration-200"
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Ubah Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
