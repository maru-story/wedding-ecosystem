'use client';

import { useState, useRef } from 'react';
import { ApiError } from '@/lib/api';
import { useImportGuests, useEvent } from '@/hooks/queries';
import { toast } from 'sonner';
import { DEFAULT_MAX_GUESTS, CSV_MAX_ROWS, CSV_MAX_FILE_SIZE } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Upload, RefreshCw, Download } from 'lucide-react';

interface CsvImportModalProps {
  onClose: () => void;
  onComplete: () => void;
  currentCount: number;
}

type ImportState = 'idle' | 'uploading' | 'done' | 'error';

export function CsvImportModal({ onClose, onComplete, currentCount }: CsvImportModalProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; errors: number; details: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importGuestsMutation = useImportGuests();
  const { data: eventData } = useEvent();
  const maxGuests = eventData?.event_config?.max_guests ?? DEFAULT_MAX_GUESTS;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (!file.name.endsWith('.csv')) {
      const errMsg = 'File harus berformat CSV (.csv)';
      toast.error(errMsg);
      setError(errMsg);
      setState('error');
      return;
    }

    if (file.size > CSV_MAX_FILE_SIZE) {
      const errMsg = 'Ukuran file maksimal 5MB';
      toast.error(errMsg);
      setError(errMsg);
      setState('error');
      return;
    }

    setState('uploading');
    setError('');
    setProgress(10);

    try {
      const csvText = await file.text();
      setProgress(30);

      const rowCount = csvText.split('\n').filter((line) => line.trim()).length - 1;
      if (rowCount > CSV_MAX_ROWS) {
        const errMsg = `File CSV melebihi batas maksimal ${CSV_MAX_ROWS} baris. Ditemukan: ${rowCount} baris`;
        toast.error(errMsg);
        setError(errMsg);
        setState('error');
        setProgress(0);
        return;
      }

      setProgress(50);

      const response = await importGuestsMutation.mutateAsync({ csv_text: csvText });

      setProgress(100);
      setResult(response);
      setState('done');

      if (response.errors > 0 && response.imported === 0) {
        toast.error(`Import selesai dengan kegagalan. Semua ${response.errors} baris tidak valid.`);
      } else if (response.errors > 0) {
        toast.warning(
          `Import selesai: ${response.imported} tamu berhasil ditambahkan, ${response.errors} baris gagal.`
        );
      } else {
        toast.success(`${response.imported} tamu berhasil diimport!`);
      }
    } catch (err) {
      let message = 'Terjadi kesalahan saat mengimport file';
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        message = data.message || message;
      }
      toast.error(message);
      setError(message);
      setState('error');
      setProgress(0);
    }
  }

  function handleReset() {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-card border-border/40">
        <DialogHeader>
          <DialogTitle id="import-modal-title" className="font-heading text-xl text-foreground">
            Import Tamu dari CSV
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {state === 'done'
              ? 'Laporan hasil import daftar tamu undangan.'
              : state === 'error'
                ? 'Terjadi kesalahan saat memproses file CSV.'
                : 'Pilih file CSV untuk mengimport daftar tamu secara massal.'}
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-border/60 p-8 text-center transition-colors hover:border-primary/40"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">Klik untuk memilih file CSV</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 border-border/60 hover:bg-accent"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Pilih File
              </Button>
              <input
                ref={fileInputRef}
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Format CSV:</p>
                <a
                  href="/template-import-tamu.csv"
                  download="template-import-tamu.csv"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh Template CSV
                </a>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>
                  • Kolom wajib:{' '}
                  <code className="rounded bg-muted px-1 font-mono">nama</code>,{' '}
                  <code className="rounded bg-muted px-1 font-mono">grup</code>
                </li>
                <li>
                  • Kolom opsional:{' '}
                  <code className="rounded bg-muted px-1 font-mono">telepon</code>,{' '}
                  <code className="rounded bg-muted px-1 font-mono">jumlah_tamu</code>{' '}
                  (atau <code className="rounded bg-muted px-1 font-mono">plus_one_count</code>)
                </li>
                <li>
                  • Grup valid:{' '}
                  <code className="rounded bg-muted px-1 font-mono">family</code>,{' '}
                  <code className="rounded bg-muted px-1 font-mono">friend</code>,{' '}
                  <code className="rounded bg-muted px-1 font-mono">colleague</code>,{' '}
                  <code className="rounded bg-muted px-1 font-mono">vip</code>
                </li>
                <li>• Maksimal {CSV_MAX_ROWS} baris per file</li>
                <li>
                  • Kuota tersisa:{' '}
                  <span className="font-semibold text-foreground">
                    {Math.max(0, maxGuests - currentCount)}
                  </span>{' '}
                  tamu lagi (Kapasitas saat ini: {currentCount}/{maxGuests})
                </li>
                <li>
                  • Format nomor telepon wajib diawali kode negara (contoh:{' '}
                  <code className="rounded bg-muted px-1 font-mono">+628...</code>) untuk menghindari pemotongan angka 0 oleh Excel
                </li>
              </ul>
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="py-8 text-center">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium text-foreground">Mengimport tamu...</p>
            <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
            <div className="mx-auto mt-4 h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {state === 'done' && result && (
          <div className="space-y-6">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Import selesai</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-4 text-center border border-border/40">
                <p className="text-2xl font-bold text-foreground">{result.imported + result.errors}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Baris</p>
              </div>
              <div className="rounded-lg bg-emerald-500/5 p-4 text-center border border-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.imported}</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">Berhasil</p>
              </div>
              <div className="rounded-lg bg-destructive/5 p-4 text-center border border-destructive/10">
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-xs text-destructive/80 mt-1">Gagal</p>
              </div>
            </div>

            {result.errors > 0 && result.details && result.details.length > 0 && (
              <div className="rounded-lg border border-border/40 p-4 max-h-40 overflow-y-auto space-y-1.5 bg-muted/20">
                <p className="text-xs font-semibold text-foreground">Detail Kegagalan:</p>
                {result.details.map((detail: any, idx: number) => (
                  <p key={idx} className="text-xs text-destructive">
                    Baris {detail.row}: {detail.reason}
                  </p>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                Import Lagi
              </Button>
              <Button
                onClick={() => {
                  onComplete();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                Selesai
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center flex flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Import Gagal</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                Tutup
              </Button>
              <Button
                onClick={handleReset}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                Coba Lagi
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'idle' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
