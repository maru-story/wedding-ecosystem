'use client';

import QRCode from 'react-qr-code';
import { ApiError } from '@/lib/api';
import { useGuestQr } from '@/hooks/queries';
import type { GuestListItem } from '../page';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface QrCodeModalProps {
  guest: GuestListItem;
  onClose: () => void;
}

export function QrCodeModal({ guest, onClose }: QrCodeModalProps) {
  const { data: qrData, isLoading, error } = useGuestQr(guest.id);

  let errorMessage = '';
  if (error) {
    if (error instanceof ApiError) {
      const errData = error.data as { error?: { message?: string }; message?: string };
      errorMessage = errData.error?.message || errData.message || 'Gagal memuat QR code';
    } else {
      errorMessage = 'Terjadi kesalahan saat memuat QR code';
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/40 p-6 shadow-xl">
        <DialogHeader className="mb-4">
          <DialogTitle id="qr-modal-title" className="font-heading text-xl font-bold">
            QR Code Tamu
          </DialogTitle>
          <DialogDescription className="sr-only">
            QR Code untuk tamu {guest.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 text-center">
          <p className="text-lg font-medium text-foreground">{guest.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{guest.group}</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive font-semibold">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && qrData && (
          <div className="text-center">
            {qrData.qr_payload ? (
              <div className="mx-auto inline-block rounded-lg border border-border p-4 bg-white">
                <QRCode
                  value={qrData.qr_payload}
                  size={192}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox="0 0 192 192"
                />
              </div>
            ) : (
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">QR Code belum tersedia</p>
              </div>
            )}
            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  qrData.is_active 
                    ? 'bg-success/15 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {qrData.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-border/60 text-muted-foreground hover:text-foreground"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
