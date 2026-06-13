'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { motion } from 'motion/react';

interface InvitationCoverProps {
  brideName: string;
  groomName: string;
  guestName: string;
  eventDate: string;
  qrPayload?: string | null;
  coverContent?: {
    title?: string;
    subtitle?: string;
    background_image?: string;
    opening_text?: string;
  };
}

export function InvitationCover({
  brideName,
  groomName,
  guestName,
  eventDate,
  qrPayload,
  coverContent,
}: InvitationCoverProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Loading progress bar simulation
  useEffect(() => {
    // Lock scroll initially
    document.body.style.overflow = 'hidden';

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Small delay before fading out loading overlay
          setTimeout(() => setIsLoading(false), 500);
          return 100;
        }
        // Random progress increments
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 100);

    return () => {
      clearInterval(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleOpen = () => {
    setIsOpened(true);
    document.body.style.overflow = 'auto';

    // Play background audio programmatically inside the user interaction callstack
    try {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.play().catch((err) => console.log('Audio autoplay blocked or failed:', err));
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const formattedDate = new Date(eventDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (isOpened) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto min-h-screen max-w-md bg-[var(--color-background)] select-none">
      {/* 1. Loading Overlay with Dynamic Theme Styling */}
      {isLoading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-background)] px-8 transition-opacity duration-500"
          style={{
            opacity: progress === 100 ? 0 : 1,
            pointerEvents: progress === 100 ? 'none' : 'auto',
          }}
        >
          <div className="w-full max-w-xs space-y-4 text-center">
            <h2 className="font-heading animate-pulse text-lg font-semibold text-[var(--color-primary)]">
              {progress < 100 ? 'Memuat Undangan...' : 'Selamat Datang'}
            </h2>
            <div className="bg-muted/40 h-4 w-full overflow-hidden rounded-full border border-[var(--color-accent)]/30 p-[2px]">
              <div
                className="flex h-full items-center justify-end rounded-full bg-[var(--color-primary)] pr-2 transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              >
                {progress > 15 && (
                  <span className="text-[10px] leading-none font-bold text-white">{progress}%</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Cover Page */}
      <section
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{
          backgroundImage: coverContent?.background_image
            ? `url(${coverContent.background_image})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-[var(--color-background)]/90" />

        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Opening text */}
          <p className="text-xs tracking-widest text-[var(--color-text)]/70 uppercase">
            {coverContent?.opening_text || 'Undangan Pernikahan'}
          </p>

          {/* Couple names */}
          <h1 className="font-heading text-3xl leading-tight font-bold text-[var(--color-primary)] sm:text-4xl">
            {coverContent?.title || `${brideName} & ${groomName}`}
          </h1>

          {/* Date */}
          <p className="text-sm text-[var(--color-text)]/80">{formattedDate}</p>

          {/* Divider */}
          <div className="my-2 h-px w-16 bg-[var(--color-accent)]" />

          {/* Personal Greeting Card & QR Code */}
          <div className="flex min-w-[240px] flex-col items-center gap-4 rounded-xl border border-[var(--color-accent)]/30 bg-white/50 p-5 shadow-sm backdrop-blur-sm">
            <div className="text-center">
              <p className="text-[10px] tracking-wider text-[var(--color-text)]/60 uppercase">
                Kepada Yth.
              </p>
              <p className="font-heading mt-1 text-lg font-semibold text-[var(--color-text)]">
                {guestName}
              </p>
            </div>

            {/* Guest Entry QR Ticket */}
            {qrPayload ? (
              <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-inner">
                <QRCode
                  value={qrPayload}
                  size={120}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
                <p className="text-muted-foreground mt-1.5 text-center text-[8px] tracking-widest uppercase select-all">
                  KODE MASUK QR
                </p>
              </div>
            ) : (
              <div className="bg-muted/40 flex h-[120px] w-[120px] items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-muted-foreground px-2 text-center text-[9px]">
                  QR Code Belum Tersedia
                </p>
              </div>
            )}
          </div>

          {/* Open invitation button */}
          <button
            onClick={handleOpen}
            className="mt-4 cursor-pointer rounded-full bg-[var(--color-primary)] px-8 py-3 text-xs font-semibold tracking-wider text-white uppercase shadow-lg transition-all hover:opacity-95 active:scale-95"
          >
            Buka Undangan
          </button>
        </div>
      </section>
    </div>
  );
}
