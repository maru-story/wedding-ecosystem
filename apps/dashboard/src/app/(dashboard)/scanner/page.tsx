'use client';

import { useEffect } from 'react';

export default function ScannerRedirectPage() {
  useEffect(() => {
    const scannerUrl = process.env.NEXT_PUBLIC_SCANNER_URL || 'http://localhost:3002';
    window.location.href = scannerUrl;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
      <p className="text-muted-foreground text-base font-medium animate-pulse">
        Mengalihkan ke Scanner PWA...
      </p>
    </div>
  );
}
