'use client';

import { useEffect } from 'react';

export default function ScannerRedirectPage() {
  useEffect(() => {
    const scannerUrl = process.env.NEXT_PUBLIC_SCANNER_URL || 'http://localhost:3002';
    window.location.href = scannerUrl;
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <div className="border-primary h-12 w-12 animate-spin rounded-full border-t-4 border-b-4"></div>
      <p className="text-muted-foreground animate-pulse text-base font-medium">
        Mengalihkan ke Scanner PWA...
      </p>
    </div>
  );
}
