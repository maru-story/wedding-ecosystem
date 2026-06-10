/**
 * Login screen for Scanner PWA.
 * Simple email/password form for scanner operators.
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { login, type AuthUser, AuthError } from '@/lib/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email dan password harus diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(email.trim(), password);
      onLoginSuccess(response.user, response.tokens.access_token);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan. Periksa koneksi internet Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center px-4">
      <div className="border-border/40 bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="bg-sage/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <svg
              className="text-sage h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-charcoal text-xl font-bold">Wedding Scanner</h1>
          <p className="text-charcoal/60 mt-1 text-sm">Masuk untuk memulai verifikasi tamu</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="border-danger/20 bg-danger/10 rounded-lg border px-4 py-3">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {/* Email/Username field */}
          <div>
            <label htmlFor="email" className="text-charcoal/80 mb-1 block text-sm font-medium">
              Email atau Username
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username atau email"
              autoComplete="username"
              disabled={isLoading}
              className="border-border/60 text-charcoal placeholder-charcoal/40 focus:border-sage focus:ring-sage/20 disabled:bg-cream disabled:text-charcoal/40 w-full rounded-xl border bg-white px-4 py-3 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="text-charcoal/80 mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              className="border-border/60 text-charcoal placeholder-charcoal/40 focus:border-sage focus:ring-sage/20 disabled:bg-cream disabled:text-charcoal/40 w-full rounded-xl border bg-white px-4 py-3 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="bg-sage hover:bg-sage/90 focus:ring-sage/20 disabled:bg-sage/50 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus:ring-2 focus:outline-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Memproses...
              </span>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-charcoal/40 mt-6 text-center text-xs">
          Hubungi admin jika belum memiliki akun scanner.
        </p>
      </div>
    </div>
  );
}
