/**
 * Go-Show registration form component.
 * Allows usher to register walk-in guests not found in the guest list.
 * Field: nama (required).
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useState, type FormEvent } from 'react';

interface GoShowFormProps {
  onSubmit: (nama: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
  /** Pre-filled search query as initial name value */
  initialName?: string;
}

export function GoShowForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
  initialName = '',
}: GoShowFormProps) {
  const [nama, setNama] = useState(initialName);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = nama.trim();
    if (!trimmedName) {
      setValidationError('Nama tamu wajib diisi');
      return;
    }

    await onSubmit(trimmedName);
  };

  return (
    <div className="border-border/40 bg-card rounded-xl border p-5 shadow-sm">
      <h3 className="font-heading text-charcoal text-lg font-bold">Tambah Tamu Go-Show</h3>
      <p className="text-charcoal/60 mt-1 text-sm">Daftarkan tamu walk-in yang belum terdaftar</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Nama field */}
        <div>
          <label htmlFor="go-show-nama" className="text-charcoal/80 block text-sm font-medium">
            Nama Tamu <span className="text-danger">*</span>
          </label>
          <input
            id="go-show-nama"
            type="text"
            value={nama}
            onChange={(e) => {
              setNama(e.target.value);
              setValidationError(null);
            }}
            placeholder="Masukkan nama tamu"
            className="border-border/60 text-charcoal placeholder-charcoal/40 focus:border-sage focus:ring-sage/20 mt-1 block w-full rounded-xl border bg-white px-4 py-3 text-base transition-colors focus:ring-2 focus:outline-none"
            disabled={isLoading}
            autoFocus
            aria-required="true"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'go-show-error' : undefined}
          />
          {validationError && (
            <p id="go-show-error" className="text-danger mt-1.5 text-sm" role="alert">
              {validationError}
            </p>
          )}
        </div>

        {/* Server error */}
        {error && (
          <div
            className="bg-danger/10 border-danger/20 text-danger rounded-lg border p-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="border-border/60 text-charcoal hover:bg-blush/40 flex-1 rounded-xl border bg-white px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-sage hover:bg-sage/90 flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Mendaftarkan...' : 'Daftarkan'}
          </button>
        </div>
      </form>
    </div>
  );
}
