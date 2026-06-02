'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import type { GuestData } from '@/lib/api';

interface QrTicketProps {
  guest: GuestData;
}

export function QrTicket({ guest }: QrTicketProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!guest.qr_payload) return null;

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-ticket-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    
    // Use high resolution for clear prints/scans
    canvas.width = 512;
    canvas.height = 512;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill background with white to guarantee scannability
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = () => {
      // Draw QR code centered with margin
      const margin = 32;
      ctx.drawImage(img, margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Tiket_${guest.name.replace(/\s+/g, '_')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      {/* Floating QR Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 md:left-[calc(50%-13rem)] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Buka Tiket QR"
        title="Tiket QR"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <line x1="7" y1="7" x2="7" y2="7.01" />
          <line x1="17" y1="7" x2="17" y2="7.01" />
          <line x1="17" y1="17" x2="17" y2="17.01" />
          <line x1="7" y1="17" x2="7" y2="17.01" />
        </svg>
      </button>

      {/* Modal Popup */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center border border-gray-100 flex flex-col items-center"
            >
              <h3 className="font-heading text-lg font-bold text-gray-800">
                Tiket Masuk Anda
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Tunjukkan QR Code ini kepada petugas check-in di venue
              </p>

              {/* Guest Card Info */}
              <div className="w-full bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center mb-6">
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Nama Tamu
                </p>
                <p className="font-heading font-bold text-gray-800 text-lg mt-0.5 mb-4 truncate w-full px-2">
                  {guest.name}
                </p>

                {/* QR Code Wrapper */}
                <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100 flex items-center justify-center">
                  <QRCode
                    id="qr-ticket-svg"
                    value={guest.qr_payload}
                    size={160}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2">
                <button
                  onClick={downloadQRCode}
                  className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-md transition-[opacity,transform] hover:opacity-95 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Unduh QR Code
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-full bg-gray-100 hover:bg-gray-200 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
