'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SectionWrapper } from './section-wrapper';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryPhoto {
  url?: string;
  caption?: string;
  order?: number;
}

interface GalleryContent {
  photos?: GalleryPhoto[];
}

interface GallerySectionProps {
  content: GalleryContent;
  sortOrder: number;
}

export function GallerySection({ content, sortOrder }: GallerySectionProps) {
  const photos = (content.photos || [])
    .filter((p) => p.url)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const [currentIndex, setCurrentIndex] = useState(0);

  // If there are no photos, show filler placeholder photos
  const activePhotos =
    photos.length > 0
      ? photos
      : [
          { url: '', caption: 'Momen Bahagia 1' },
          { url: '', caption: 'Momen Bahagia 2' },
          { url: '', caption: 'Momen Bahagia 3' },
        ];

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % activePhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + activePhotos.length) % activePhotos.length);
  };

  const currentPhoto = activePhotos[currentIndex];

  return (
    <SectionWrapper sectionType="gallery" sortOrder={sortOrder} className="relative select-none">
      {/* Title */}
      <div className="absolute top-8 left-1/2 w-full -translate-x-1/2 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-wide text-[var(--color-primary)]">
          Galeri Foto
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-12 bg-[var(--color-accent)]" />
      </div>

      {/* Main Image Container */}
      <div className="relative mt-12 flex h-[340px] w-full max-w-[310px] flex-col justify-between rounded-2xl border border-[var(--color-accent)]/20 bg-white/40 p-3 shadow-xs backdrop-blur-xs">
        <div className="bg-muted/20 relative flex h-[280px] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {currentPhoto.url &&
              (currentPhoto.url.startsWith('http') || currentPhoto.url.startsWith('/')) ? (
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.caption || `Foto ${currentIndex + 1}`}
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="310px"
                />
              ) : (
                <div className="bg-muted/10 flex h-full w-full flex-col items-center justify-center">
                  <span className="mb-2 text-5xl">📸</span>
                  <span className="text-muted-foreground text-xs tracking-widest uppercase">
                    Galeri Foto
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <div className="mt-2 flex h-6 items-center justify-center text-center">
          {currentPhoto.caption && (
            <p className="line-clamp-1 text-xs text-[var(--color-text)]/80 italic">
              {currentPhoto.caption}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Buttons and Indicators */}
      <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 flex-col items-center gap-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-6">
          <button
            onClick={prevPhoto}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-white/70 text-[var(--color-primary)] transition-transform hover:bg-white active:scale-90"
            aria-label="Foto sebelumnya"
          >
            ←
          </button>

          {/* Slide dots */}
          <div className="flex gap-2">
            {activePhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-all ${
                  currentIndex === index
                    ? 'scale-110 bg-[var(--color-primary)]'
                    : 'bg-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/60'
                }`}
                aria-label={`Ke slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextPhoto}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-white/70 text-[var(--color-primary)] transition-transform hover:bg-white active:scale-90"
            aria-label="Foto selanjutnya"
          >
            →
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}
