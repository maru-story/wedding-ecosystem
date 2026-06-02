'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitRsvp, fetchRsvp, type RsvpResponse } from '@/lib/api';

const attendanceOptions = [
  { value: 'akad', label: 'Akad Nikah' },
  { value: 'resepsi', label: 'Resepsi' },
  { value: 'both', label: 'Keduanya' },
  { value: 'decline', label: 'Tidak Hadir' },
] as const;

type AttendanceValue = 'akad' | 'resepsi' | 'both' | 'decline';

function createRsvpSchema(plusOneCount: number) {
  return z
    .object({
      attendance: z.enum(['akad', 'resepsi', 'both', 'decline'], {
        required_error: 'Pilih kehadiran Anda',
      }),
      guest_count: z.coerce
        .number()
        .min(1, 'Minimal 1 tamu')
        .max(plusOneCount + 1, `Maksimal ${plusOneCount + 1} tamu`)
        .optional(),
    })
    .transform((data) => {
      if (data.attendance === 'decline') {
        return { ...data, guest_count: 0 };
      }
      return data;
    });
}

type RsvpFormValues = z.input<ReturnType<typeof createRsvpSchema>>;

interface RsvpFormProps {
  guestId: string;
  eventId: string;
  plusOneCount: number;
}

/**
 * RSVP form component for guests to confirm attendance.
 * Shows/hides guest_count based on attendance choice.
 * Validates guest_count against plus_one_count + 1.
 */
export function RsvpForm({ guestId, eventId, plusOneCount }: RsvpFormProps) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [existingRsvp, setExistingRsvp] = useState<RsvpResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingRsvp, setIsLoadingRsvp] = useState(true);

  const schema = createRsvpSchema(plusOneCount);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RsvpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendance: undefined,
      guest_count: 1,
    },
  });

  const attendance = watch('attendance') as AttendanceValue | undefined;
  const showGuestCount = attendance && attendance !== 'decline';

  useEffect(() => {
    async function loadRsvp() {
      try {
        const data = await fetchRsvp(guestId);
        if (data) {
          setExistingRsvp(data);
        }
      } catch (err) {
        console.error('Gagal mengambil data RSVP:', err);
      } finally {
        setIsLoadingRsvp(false);
      }
    }
    loadRsvp();
  }, [guestId]);

  async function onSubmit(data: RsvpFormValues) {
    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      const result = await submitRsvp({
        guest_id: guestId,
        event_id: eventId,
        attendance: data.attendance as AttendanceValue,
        guest_count: data.attendance === 'decline' ? 0 : (data.guest_count ?? 1),
      });
      setExistingRsvp(result);
      setIsEditing(false);
      setSubmitStatus('success');
      // Tampilkan layar sukses sebentar sebelum kembali ke ringkasan RSVP
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 2000);
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim RSVP');
    }
  }

  if (isLoadingRsvp) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        <p className="text-xs text-[var(--color-text)]/65 animate-pulse">Memuat data konfirmasi...</p>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-background)] p-6 text-center">
        <div className="mb-3 text-3xl">✓</div>
        <h3 className="font-heading text-lg font-semibold text-[var(--color-primary)]">
          Terima Kasih!
        </h3>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          Konfirmasi kehadiran Anda telah tersimpan.
        </p>
      </div>
    );
  }

  if (existingRsvp && !isEditing) {
    const attendanceLabel = attendanceOptions.find((opt) => opt.value === existingRsvp.attendance)?.label || existingRsvp.attendance;
    return (
      <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-background)] p-5 text-center space-y-4">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-lg">
          ✓
        </div>
        <div>
          <h3 className="font-heading text-base font-semibold text-[var(--color-primary)]">
            Terima Kasih!
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text)]/70">
            Konfirmasi kehadiran Anda telah tersimpan.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-text)]/5 bg-[var(--color-background)]/50 p-4 text-left space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--color-text)]/65">Kehadiran</span>
            <span className="font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
              {attendanceLabel}
            </span>
          </div>
          {existingRsvp.attendance !== 'decline' && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--color-text)]/65">Jumlah Tamu</span>
              <span className="font-semibold text-[var(--color-text)]">
                {existingRsvp.guest_count} Orang
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsEditing(true);
            reset({
              attendance: existingRsvp.attendance as AttendanceValue,
              guest_count: existingRsvp.guest_count,
            });
          }}
          className="w-full rounded-full border border-[var(--color-primary)] px-6 py-2 text-xs font-semibold text-[var(--color-primary)] transition-all hover:bg-[var(--color-primary)] hover:text-white cursor-pointer"
        >
          Ubah RSVP
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Attendance options */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-[var(--color-text)]">
          Konfirmasi Kehadiran
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {attendanceOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-text)]/10 px-3 py-2.5 text-sm transition-colors has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary)]/5"
            >
              <input
                type="radio"
                value={option.value}
                {...register('attendance')}
                className="accent-[var(--color-primary)]"
              />
              <span className="text-[var(--color-text)]">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.attendance && (
          <p className="mt-2 text-xs text-red-600">{errors.attendance.message}</p>
        )}
      </fieldset>

      {/* Guest count - shown only when not declining */}
      {showGuestCount && (
        <div>
          <label
            htmlFor="guest_count"
            className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
          >
            Jumlah Tamu (termasuk Anda)
          </label>
          <input
            id="guest_count"
            type="number"
            min={1}
            max={plusOneCount + 1}
            {...register('guest_count')}
            className="w-full rounded-lg border border-[var(--color-text)]/10 bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {errors.guest_count && (
            <p className="mt-1.5 text-xs text-red-600">{errors.guest_count.message}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-text)]/50">
            Maksimal {plusOneCount + 1} tamu
          </p>
        </div>
      )}

      {/* Error message */}
      {submitStatus === 'error' && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitStatus === 'loading'}
        className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {submitStatus === 'loading' ? 'Mengirim...' : 'Kirim Konfirmasi'}
      </button>
    </form>
  );
}
