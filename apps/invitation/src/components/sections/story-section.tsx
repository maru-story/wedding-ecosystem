'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SectionWrapper } from './section-wrapper';
import { motion, AnimatePresence } from 'motion/react';

interface StoryChapter {
  title?: string;
  description?: string;
  image?: string;
  date?: string;
}

interface StoryContent {
  chapters?: StoryChapter[];
}

interface StorySectionProps {
  content: StoryContent;
  sortOrder: number;
}

export function StorySection({ content, sortOrder }: StorySectionProps) {
  const chapters =
    content.chapters && content.chapters.length > 0
      ? content.chapters
      : [
          {
            title: 'Pertama Bertemu',
            date: '10 Januari 2024',
            description: 'Awal mula kisah indah kami dimulai dari pertemuan yang tidak disengaja.',
            image: '',
          },
          {
            title: 'Menjalin Hubungan',
            date: '15 Maret 2024',
            description: 'Kami memutuskan untuk melangkah bersama dan berkomitmen satu sama lain.',
            image: '',
          },
          {
            title: 'Lamaran',
            date: '20 Desember 2025',
            description:
              'Di hadapan keluarga besar, kami mengikat janji untuk melangkah ke pelaminan.',
            image: '',
          },
        ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextChapter = () => {
    setCurrentIndex((prev) => (prev + 1) % chapters.length);
  };

  const prevChapter = () => {
    setCurrentIndex((prev) => (prev - 1 + chapters.length) % chapters.length);
  };

  const currentChapter = chapters[currentIndex];

  return (
    <SectionWrapper sectionType="story" sortOrder={sortOrder} className="relative select-none">
      {/* Background decoration or title */}
      <div className="absolute top-8 left-1/2 w-full -translate-x-1/2 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-wide text-[var(--color-primary)]">
          Cerita Kami
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-12 bg-[var(--color-accent)]" />
      </div>

      {/* Main Chapter Content Container */}
      <div className="relative mt-12 flex h-[360px] w-full max-w-[310px] flex-col justify-between rounded-2xl border border-[var(--color-accent)]/20 bg-white/40 p-5 shadow-xs backdrop-blur-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex h-full flex-col justify-between"
          >
            {/* Header & Date */}
            <div className="text-center">
              {currentChapter.date && (
                <span className="text-[10px] font-semibold tracking-widest text-[var(--color-accent)] uppercase">
                  {currentChapter.date}
                </span>
              )}
              {currentChapter.title && (
                <h3 className="font-heading mt-1 line-clamp-1 text-lg font-bold text-[var(--color-primary)]">
                  {currentChapter.title}
                </h3>
              )}
            </div>

            {/* Illustration/Image */}
            <div className="bg-muted/20 relative my-3 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-100 shadow-inner">
              {currentChapter.image ? (
                <Image
                  src={currentChapter.image}
                  alt={currentChapter.title || 'Cerita'}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  sizes="310px"
                />
              ) : (
                <div className="p-4 text-center">
                  <span className="mb-1 block text-4xl">📖</span>
                  <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                    Kisah Kami
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-1 items-center justify-center text-center">
              <p className="line-clamp-4 px-2 text-xs leading-relaxed text-[var(--color-text)]/85">
                {currentChapter.description || 'Tidak ada deskripsi cerita.'}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons and Indicators */}
      <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 flex-col items-center gap-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-6">
          <button
            onClick={prevChapter}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-white/70 text-[var(--color-primary)] transition-transform hover:bg-white active:scale-90"
            aria-label="Cerita sebelumnya"
          >
            ←
          </button>

          {/* Slide dots */}
          <div className="flex gap-2">
            {chapters.map((_, index) => (
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
            onClick={nextChapter}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-white/70 text-[var(--color-primary)] transition-transform hover:bg-white active:scale-90"
            aria-label="Cerita selanjutnya"
          >
            →
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}
