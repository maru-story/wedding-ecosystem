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
    <div className="fixed inset-0 max-w-md mx-auto z-50 min-h-screen bg-[var(--color-background)] select-none">
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
            <h2 className="font-heading text-lg font-semibold text-[var(--color-primary)] animate-pulse">
              {progress < 100 ? 'Memuat Undangan...' : 'Selamat Datang'}
            </h2>
            <div className="h-4 w-full rounded-full border border-[var(--color-accent)]/30 bg-muted/40 p-[2px] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200 ease-out flex items-center justify-end pr-2"
                style={{ width: `${progress}%` }}
              >
                {progress > 15 && (
                  <span className="text-[10px] font-bold text-white leading-none">
                    {progress}%
                  </span>
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
          <p className="text-xs tracking-widest uppercase text-[var(--color-text)]/70">
            {coverContent?.opening_text || 'Undangan Pernikahan'}
          </p>

          {/* Couple names */}
          <h1 className="font-heading text-3xl font-bold leading-tight text-[var(--color-primary)] sm:text-4xl">
            {coverContent?.title || `${brideName} & ${groomName}`}
          </h1>

          {/* Date */}
          <p className="text-sm text-[var(--color-text)]/80">
            {formattedDate}
          </p>

          {/* Divider */}
          <div className="my-2 h-px w-16 bg-[var(--color-accent)]" />

          {/* Personal Greeting Card & QR Code */}
          <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-accent)]/30 bg-white/50 backdrop-blur-sm p-5 shadow-sm min-w-[240px]">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text)]/60">Kepada Yth.</p>
              <p className="mt-1 font-heading text-lg font-semibold text-[var(--color-text)]">
                {guestName}
              </p>
            </div>

            {/* Guest Entry QR Ticket */}
            {qrPayload ? (
              <div className="bg-white p-2.5 rounded-lg shadow-inner border border-gray-100">
                <QRCode
                  value={qrPayload}
                  size={120}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
                <p className="text-[8px] text-muted-foreground mt-1.5 uppercase tracking-widest text-center select-all">
                  KODE MASUK QR
                </p>
              </div>
            ) : (
              <div className="h-[120px] w-[120px] bg-muted/40 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                <p className="text-[9px] text-muted-foreground px-2 text-center">QR Code Belum Tersedia</p>
              </div>
            )}
          </div>

          {/* Open invitation button */}
          <button
            onClick={handleOpen}
            className="mt-4 rounded-full bg-[var(--color-primary)] px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:opacity-95 active:scale-95 cursor-pointer"
          >
            Buka Undangan
          </button>
        </div>
      </section>
    </div>
  );
}
