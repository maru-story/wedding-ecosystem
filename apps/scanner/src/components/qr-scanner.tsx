/**
 * QR Scanner component using html5-qrcode library.
 * Handles camera initialization, QR code detection, and scan lifecycle.
 * Pauses scanning during verification display and resumes after.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
}

export function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const onScanRef = useRef(onScan);

  // Keep onScan ref up to date without triggering re-renders
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      const state = scannerRef.current.getState();
      if (state === Html5QrcodeScannerState.SCANNING) return;

      await scannerRef.current.start(
        {
          facingMode: 'environment',
        },
        {
          fps: 20, // Increased frame rate for fast responsiveness
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Adaptive 80% bounding box to prevent aggressive cropping
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(260, Math.floor(minEdge * 0.82));
            return { width: size, height: size };
          },
          aspectRatio: 1,
          disableFlip: true,
          videoConstraints: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        (decodedText) => {
          // Provide subtle haptic feedback on successful detection if supported
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(80);
            }
          } catch {
            // Ignore haptic errors
          }
          onScanRef.current(decodedText);
        },
        () => {
          // QR code not detected in this frame — no action needed
        }
      );

      // Check if torch / flashlight is supported by the camera device
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
        const torch = capabilities?.torchFeature?.();
        if (torch && torch.isSupported()) {
          setIsTorchSupported(true);
          setIsTorchOn(torch.value() ?? false);
        } else {
          setIsTorchSupported(false);
        }
      } catch {
        setIsTorchSupported(false);
      }

      setError(null);
      setIsInitializing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengakses kamera';
      setError(message);
      setIsInitializing(false);
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !isTorchSupported) return;
    try {
      const nextTorch = !isTorchOn;
      const torchFeature = scannerRef.current.getRunningTrackCameraCapabilities()?.torchFeature?.();
      if (torchFeature) {
        await torchFeature.apply(nextTorch);
        setIsTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn('Failed to toggle camera torch', err);
    }
  }, [isTorchOn, isTorchSupported]);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const state = scannerRef.current.getState();
      if (state === Html5QrcodeScannerState.SCANNING) {
        // Turn off torch when stopping scanner
        if (isTorchOn) {
          try {
            await scannerRef.current.getRunningTrackCameraCapabilities()?.torchFeature?.()?.apply(false);
            setIsTorchOn(false);
          } catch {
            // Ignore torch turn-off errors
          }
        }
        await scannerRef.current.stop();
      }
    } catch {
      // Ignore stop errors
    }
  }, [isTorchOn]);

  // Initialize scanner on mount
  useEffect(() => {
    const elementId = 'qr-scanner-region';

    // Small delay to ensure DOM element is ready
    const initTimeout = setTimeout(() => {
      // Enable Apple Neural Engine BarcodeDetector / hardware-accelerated scanning if supported
      scannerRef.current = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      startScanner();
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        try {
          const state = scanner.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            scanner
              .stop()
              .then(() => scanner.clear())
              .catch(() => {});
          } else {
            scanner.clear();
          }
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
    };
  }, [startScanner]);

  // Pause/resume scanning based on isScanning prop
  useEffect(() => {
    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [isScanning, startScanner, stopScanner]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Scanner viewport */}
      <div id="qr-scanner-region" className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-black" />

      {/* Torch / Flashlight toggle button (when supported) */}
      {!isInitializing && !error && isScanning && isTorchSupported && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={toggleTorch}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-all focus:outline-none ${
              isTorchOn
                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                : 'bg-white/90 text-charcoal border border-border/80 hover:bg-white shadow-sm'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isTorchOn ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M15 2H9a1 1 0 0 0-1 1v2a6 6 0 0 0 3 5.2V19a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8.8A6 6 0 0 0 16 5V3a1 1 0 0 0-1-1Z" />
              <path d="M12 12v3" />
            </svg>
            <span>{isTorchOn ? 'Matikan Lampu Senter' : 'Nyalakan Lampu Senter'}</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {isInitializing && !error && (
        <div className="bg-charcoal/80 absolute inset-0 flex items-center justify-center rounded-xl">
          <div className="text-center text-white">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm">Memulai kamera...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="border-danger/20 bg-danger/10 mt-4 rounded-xl border p-4 text-center">
          <p className="text-danger text-sm font-medium">Tidak dapat mengakses kamera</p>
          <p className="text-danger/80 mt-1 text-xs">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsInitializing(true);
              startScanner();
            }}
            className="bg-sage hover:bg-sage/90 focus:ring-sage/20 mt-3 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors focus:ring-2 focus:outline-none"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Scan ready indicator with helpful distance cue */}
      {!isInitializing && !error && isScanning && (
        <div className="mt-3 text-center">
          <p className="text-charcoal/70 text-sm font-medium">Arahkan kamera ke QR code tamu</p>
          <p className="text-charcoal/50 mt-0.5 text-xs">Jaga jarak ideal ~15-20 cm & hindari pantulan lampu</p>
        </div>
      )}
    </div>
  );
}
