'use client';

import QRCode from 'react-qr-code';
import { getApiErrorMessage } from '@/lib/api';
import { useGuestQr } from '@/hooks/queries';
import type { GuestListItem } from '../page';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';

interface QrCodeModalProps {
  guest: GuestListItem;
  onClose: () => void;
}

export function QrCodeModal({ guest, onClose }: QrCodeModalProps) {
  const { data: qrData, isLoading, error } = useGuestQr(guest.id);

  const errorMessage = error ? getApiErrorMessage(error, 'Gagal memuat QR code') : '';

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="QR Code Tamu"
      description={`QR Code untuk tamu ${guest.name}`}
      className="sm:max-w-md"
    >
      <div className="mb-4 text-center">
        <p className="text-foreground text-lg font-medium">{guest.name}</p>
        <p className="text-muted-foreground text-sm capitalize">{guest.group}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}

      {errorMessage && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-center text-sm font-semibold">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && qrData && (
        <div className="text-center">
          {qrData.qr_payload ? (
            <div className="border-border mx-auto inline-block rounded-xl border bg-white p-5 shadow-sm">
              <QRCode
                value={qrData.qr_payload}
                size={240}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox="0 0 240 240"
              />
            </div>
          ) : (
            <div className="border-border bg-muted/20 mx-auto flex h-48 w-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-xs">QR Code belum tersedia</p>
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
    </ResponsiveDialog>
  );
}
