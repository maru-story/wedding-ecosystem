'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchMessages, submitMessage, type MessageData } from '@/lib/api';
import { SectionWrapper } from './section-wrapper';

const messageSchema = z.object({
  sender_name: z.string().min(1, 'Nama tidak boleh kosong').max(100, 'Nama maksimal 100 karakter'),
  message_text: z
    .string()
    .min(1, 'Ucapan tidak boleh kosong')
    .max(500, 'Ucapan maksimal 500 karakter'),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface MessagesContent {
  is_enabled?: boolean;
  placeholder_text?: string;
}

interface MessagesSectionProps {
  content: MessagesContent;
  sortOrder: number;
  eventId?: string;
  guestId?: string;
}

export function MessagesSection({ content, sortOrder, eventId, guestId }: MessagesSectionProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      sender_name: '',
      message_text: '',
    },
  });

  const loadMessages = useCallback(
    async (pageNum: number) => {
      if (!eventId) return;
      setIsLoading(true);
      try {
        const data = await fetchMessages(eventId, pageNum, 5); // limit to 5 per page for compact size
        setMessages(data.messages);
        setTotalPages(data.total_pages);
        setPage(pageNum);
      } catch {
        console.error('Gagal memuat ucapan');
      } finally {
        setIsLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  const onSubmit = async (data: MessageFormValues) => {
    if (!eventId) return;
    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      await submitMessage({
        event_id: eventId,
        guest_id: guestId,
        sender_name: data.sender_name,
        message_text: data.message_text,
      });
      setSubmitStatus('success');
      reset();
      loadMessages(1);
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim ucapan');
    }
  };

  const isEnabled = content.is_enabled ?? true;
  if (!isEnabled) return null;

  return (
    <SectionWrapper
      sectionType="messages"
      sortOrder={sortOrder}
      className="flex flex-col justify-start py-8"
    >
      {/* Title */}
      <h2 className="font-heading mb-4 text-center text-2xl font-bold text-[var(--color-primary)]">
        Ucapan & Doa
      </h2>

      {/* Main Container split between Form and List */}
      <div className="my-auto flex w-full max-w-[320px] flex-col gap-4 text-left">
        {/* Form Container */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/15 bg-white/40 p-4"
        >
          <div>
            <input
              type="text"
              placeholder="Nama Anda"
              {...register('sender_name')}
              className="w-full rounded-lg border border-[var(--color-text)]/10 bg-white/80 px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            {errors.sender_name && (
              <p className="mt-0.5 text-[10px] text-red-500">{errors.sender_name.message}</p>
            )}
          </div>

          <div>
            <textarea
              rows={2}
              placeholder={content.placeholder_text || 'Tulis ucapan dan doa...'}
              {...register('message_text')}
              className="w-full resize-none rounded-lg border border-[var(--color-text)]/10 bg-white/80 px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            {errors.message_text && (
              <p className="mt-0.5 text-[10px] text-red-500">{errors.message_text.message}</p>
            )}
          </div>

          {submitStatus === 'success' && (
            <p className="text-[10px] font-semibold text-green-600">Ucapan berhasil terkirim!</p>
          )}
          {submitStatus === 'error' && (
            <p className="text-[10px] font-semibold text-red-500">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={submitStatus === 'loading'}
            className="w-full cursor-pointer rounded-full bg-[var(--color-primary)] py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {submitStatus === 'loading' ? 'Mengirim...' : 'Kirim Ucapan'}
          </button>
        </form>

        {/* List Container */}
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-accent)]/15 bg-white/40 p-4">
          <h3 className="text-[11px] font-semibold tracking-wider text-[var(--color-primary)] uppercase">
            Ucapan Doa Tamu
          </h3>

          <div className="custom-scrollbar max-h-[120px] space-y-2 overflow-y-auto pr-1">
            {isLoading && messages.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-[10px]">Memuat ucapan...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-[10px]">
                Belum ada ucapan.
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="rounded-lg border border-gray-100/50 bg-white/70 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-[10px] font-bold text-[var(--color-primary)]">
                      {msg.sender_name}
                    </span>
                    <span className="text-muted-foreground text-[8px]">
                      {new Date(msg.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text)]/90">
                    {msg.message_text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Mini Pagination */}
          {totalPages > 1 && (
            <div className="mt-1 flex items-center justify-between border-t border-[var(--color-accent)]/10 pt-2">
              <button
                onClick={() => loadMessages(page - 1)}
                disabled={page <= 1 || isLoading}
                className="cursor-pointer text-[9px] font-semibold text-[var(--color-primary)] disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-muted-foreground text-[9px]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => loadMessages(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="cursor-pointer text-[9px] font-semibold text-[var(--color-primary)] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
