import Link from 'next/link';

/**
 * Custom 404 page for the scanner PWA (Next.js best practice).
 */
export default function NotFound() {
  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-heading text-charcoal/30 text-5xl font-bold">404</h1>
        <h2 className="font-heading text-charcoal mt-4 text-lg font-bold">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-charcoal/60 mt-2 text-sm">Halaman yang Anda cari tidak tersedia.</p>
        <Link
          href="/"
          className="bg-sage hover:bg-sage/90 mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Kembali ke Scanner
        </Link>
      </div>
    </div>
  );
}
