'use client';

import { useState, useRef } from 'react';
import { ApiError } from '@/lib/api';
import { useImportGuests, useEvent } from '@/hooks/queries';
import { toast } from 'sonner';
import { DEFAULT_MAX_GUESTS, CSV_MAX_ROWS, CSV_MAX_FILE_SIZE } from '@/lib/constants';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
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
  const [result, setResult] = useState<{ imported: number; errors: number; details: any[] } | null>(
    null
  );
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
    <ResponsiveDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Import Tamu dari CSV"
      description={
        state === 'done'
          ? 'Laporan hasil import daftar tamu undangan.'
          : state === 'error'
            ? 'Terjadi kesalahan saat memproses file CSV.'
            : 'Pilih file CSV untuk mengimport daftar tamu secara massal.'
      }
      className="sm:max-w-lg"
    >
      {state === 'idle' && (
        <div className="space-y-4">
          <div
            className="border-border/60 hover:border-primary/40 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="text-muted-foreground/50 mx-auto h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm">Klik untuk memilih file CSV</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/60 hover:bg-accent mt-3"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
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

          <div className="bg-muted/40 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-sm font-medium">Format CSV:</p>
              <a
                href="/template-import-tamu.csv"
                download="template-import-tamu.csv"
                className="text-primary flex cursor-pointer items-center gap-1 text-xs font-medium hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh Template CSV
              </a>
            </div>
            <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
              <li>
                • Kolom wajib: <code className="bg-muted rounded px-1 font-mono">nama</code>,{' '}
                <code className="bg-muted rounded px-1 font-mono">grup</code>
              </li>
              <li>
                • Kolom opsional: <code className="bg-muted rounded px-1 font-mono">telepon</code>
                , <code className="bg-muted rounded px-1 font-mono">jumlah_tamu</code> (atau{' '}
                <code className="bg-muted rounded px-1 font-mono">plus_one_count</code>)
              </li>
              <li>
                • Grup: Bebas diisi (contoh:{' '}
                <code className="bg-muted rounded px-1 font-mono">Keluarga</code>,{' '}
                <code className="bg-muted rounded px-1 font-mono">Teman</code>,{' '}
                <code className="bg-muted rounded px-1 font-mono">Rekan Kerja</code>,{' '}
                <code className="bg-muted rounded px-1 font-mono">VIP</code>)
              </li>
              <li>
                • Duplikasi: Nama tamu yang sama di dalam file CSV atau yang sudah ada di database akan dilewati secara otomatis untuk menghindari duplikasi.
              </li>
              <li>• Maksimal {CSV_MAX_ROWS} baris per file</li>
              <li>
                • Kuota tersisa:{' '}
                <span className="text-foreground font-semibold">
                  {Math.max(0, maxGuests - currentCount)}
                </span>{' '}
                tamu lagi (Kapasitas saat ini: {currentCount}/{maxGuests})
              </li>
              <li>
                • Format nomor telepon wajib diawali kode negara (contoh:{' '}
                <code className="bg-muted rounded px-1 font-mono">+628...</code>) untuk
                menghindari pemotongan angka 0 oleh Excel
              </li>
            </ul>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="py-8 text-center">
          <RefreshCw className="text-primary mx-auto h-10 w-10 animate-spin" />
          <p className="text-foreground mt-4 text-sm font-medium">Mengimport tamu...</p>
          <p className="text-muted-foreground mt-1 text-xs">{fileName}</p>
          <div className="bg-muted mx-auto mt-4 h-2 w-64 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
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
          <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Import selesai
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 border-border/40 rounded-lg border p-4 text-center">
              <p className="text-foreground text-2xl font-bold">
                {result.imported + result.errors}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Total Baris</p>
            </div>
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {result.imported}
              </p>
              <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">
                Berhasil
              </p>
            </div>
            <div className="bg-destructive/5 border-destructive/10 rounded-lg border p-4 text-center">
              <p className="text-destructive text-2xl font-bold">{result.errors}</p>
              <p className="text-destructive/80 mt-1 text-xs">Gagal</p>
            </div>
          </div>

          {result.errors > 0 && result.details && result.details.length > 0 && (
            <div className="border-border/40 bg-muted/20 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border p-4">
              <p className="text-foreground text-xs font-semibold">Detail Kegagalan:</p>
              {result.details.map((detail: any, idx: number) => (
                <p key={idx} className="text-destructive text-xs">
                  Baris {detail.row}: {detail.reason}
                </p>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
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
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-6">
          <div className="bg-destructive/10 border-destructive/20 flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
            <AlertTriangle className="text-destructive h-6 w-6" />
            <p className="text-destructive text-sm font-semibold">Import Gagal</p>
            <p className="text-muted-foreground mt-1 text-xs">{error}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
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
          </div>
        </div>
      )}

      {state === 'idle' && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            Batal
          </Button>
        </div>
      )}
    </ResponsiveDialog>
  );
}
