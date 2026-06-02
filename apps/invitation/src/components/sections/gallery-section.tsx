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
  const activePhotos = photos.length > 0 ? photos : [
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
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full text-center">
        <h2 className="font-heading text-3xl font-bold text-[var(--color-primary)] tracking-wide">
          Galeri Foto
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-12 bg-[var(--color-accent)]" />
      </div>

      {/* Main Image Container */}
      <div className="relative w-full max-w-[310px] h-[340px] mt-12 bg-white/40 backdrop-blur-xs rounded-2xl border border-[var(--color-accent)]/20 p-3 shadow-xs flex flex-col justify-between">
        <div className="relative w-full h-[280px] overflow-hidden rounded-xl bg-muted/20 border border-gray-100 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {currentPhoto.url && (currentPhoto.url.startsWith('http') || currentPhoto.url.startsWith('/')) ? (
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.caption || `Foto ${currentIndex + 1}`}
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="310px"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-muted/10">
                  <span className="text-5xl mb-2">📸</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Galeri Foto</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <div className="h-6 flex items-center justify-center text-center mt-2">
          {currentPhoto.caption && (
            <p className="text-xs italic text-[var(--color-text)]/80 line-clamp-1">
              {currentPhoto.caption}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Buttons and Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full">
        {/* Navigation buttons */}
        <div className="flex items-center gap-6">
          <button
            onClick={prevPhoto}
            className="h-8 w-8 rounded-full border border-[var(--color-accent)]/30 bg-white/70 hover:bg-white flex items-center justify-center text-[var(--color-primary)] active:scale-90 transition-transform cursor-pointer"
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
                className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === index
                    ? 'bg-[var(--color-primary)] scale-110'
                    : 'bg-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/60'
                }`}
                aria-label={`Ke slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextPhoto}
            className="h-8 w-8 rounded-full border border-[var(--color-accent)]/30 bg-white/70 hover:bg-white flex items-center justify-center text-[var(--color-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label="Foto selanjutnya"
          >
            →
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}

